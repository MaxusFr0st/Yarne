using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

/// <summary>
/// The public order status page's API: anyone holding the order's link token can follow the order and
/// choose how to pay. Unknown, malformed and voided tokens all answer the same bare 404, so nothing
/// reveals whether an order exists.
/// </summary>
[ApiController]
[Route("api/orders/status")]
[AllowAnonymous]
[EnableRateLimiting("order-status")]
public class OrderStatusController : ControllerBase
{
    public const string PaymentSettingKey = "yarne.payment.v1";

    /// <summary>Until the order ships, the customer may still choose or change how to pay.</summary>
    private static readonly HashSet<string> PaymentChoiceStatuses = new(StringComparer.Ordinal)
    {
        "Pending", "Accepted", "InProduction", "Made",
    };

    private readonly YarneDbContext _context;
    private readonly IStorefrontSettingsService _settings;
    private readonly IConfiguration _configuration;
    private readonly OrderNotifier _notifier;
    private readonly IR2ImageStorageService _storage;

    public OrderStatusController(
        YarneDbContext context,
        IStorefrontSettingsService settings,
        IConfiguration configuration,
        OrderNotifier notifier,
        IR2ImageStorageService storage)
    {
        _notifier = notifier;
        _storage = storage;
        _context = context;
        _settings = settings;
        _configuration = configuration;
    }

    [HttpGet("{token}")]
    [ProducesResponseType(typeof(PublicOrderStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PublicOrderStatusDto>> Get(string token, CancellationToken ct = default)
    {
        var order = await FindAsync(token, asNoTracking: true, ct);
        if (order == null)
            return NotFound();

        return Ok(await MapAsync(order, ct));
    }

    [HttpPost("{token}/payment-choice")]
    [ProducesResponseType(typeof(PublicOrderStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PublicOrderStatusDto>> SetPaymentChoice(
        string token,
        [FromBody] SetPaymentChoiceRequest request,
        CancellationToken ct = default)
    {
        var order = await FindAsync(token, asNoTracking: false, ct);
        if (order == null)
            return NotFound();

        var choice = NormalizeChoice(request?.Choice);
        if (choice == null)
            return BadRequest(new { message = "Please choose how you would like to pay." });

        if (!PaymentChoiceStatuses.Contains(order.Status))
            return Conflict(new { message = "The payment method can no longer be chosen for this order." });

        // Abroad there is no pay-on-pickup: only a bank transfer, paid in advance.
        if (order.IsForeignDelivery && choice == "Pickup")
            return BadRequest(new { message = "Orders delivered abroad are paid by bank transfer." });

        // The choice is made once. The same one again changes nothing (and sends nothing); a different one is refused,
        // until the owner resets it from the admin.
        if (order.PaymentChoice != null && !string.Equals(order.PaymentChoice, choice, StringComparison.Ordinal))
            return Conflict(new { message = "The payment method has already been chosen. To change it, please write to us." });

        if (order.PaymentChoice == null)
        {
            order.PaymentChoice = choice;
            order.PaymentChoiceAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            _notifier.NotifyOwner(order, OrderEmailEvent.InternalPaymentChosen);
        }

        return Ok(await MapAsync(order, ct));
    }

    /// <summary>
    /// "I have paid": the receipt image (JPEG, PNG, WebP or HEIC, at most 5 MB, recognised by its content) sent with the claim, stored
    /// privately. One claim per order and no replacement afterwards; the admin's reset reopens it. Nothing is stored before this call.
    /// </summary>
    [HttpPost("{token}/payment-claim")]
    [EnableRateLimiting("order-receipt")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [ProducesResponseType(typeof(PublicOrderStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<PublicOrderStatusDto>> ClaimPayment(string token, IFormFile? file, CancellationToken ct = default)
    {
        var order = await FindAsync(token, asNoTracking: false, ct);
        if (order == null)
            return NotFound();

        if (order.PaymentChoice != "Transfer" || !PaymentChoiceStatuses.Contains(order.Status) || order.PaymentReceivedAt != null)
            return Conflict(new { message = "This order is not waiting for a payment receipt." });
        if (order.PaymentClaimedAt != null)
            return Conflict(new { message = "We already have your receipt and will confirm the payment soon." });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Please attach a photo of the receipt." });
        if (file.Length > ReceiptImage.MaxBytes)
            return BadRequest(new { message = "The photo is too large: 5 MB at most." });
        if (!_storage.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "We can't take the receipt right now. Please try again later." });

        var head = new byte[16];
        int read;
        await using (var peek = file.OpenReadStream())
            read = await peek.ReadAsync(head.AsMemory(0, head.Length), ct);

        var kind = ReceiptImage.Sniff(head.AsSpan(0, read));
        if (kind == null)
            return BadRequest(new { message = "Please attach a photo or screenshot (JPEG, PNG, WebP or HEIC)." });

        var key = $"receipts/{order.Id}-{Guid.NewGuid():N}{kind.Value.Extension}";
        await using (var content = file.OpenReadStream())
            await _storage.PutPrivateAsync(content, kind.Value.ContentType, key, ct);

        order.ReceiptKey = key;
        order.ReceiptContentType = kind.Value.ContentType;
        order.ReceiptUploadedAt = DateTime.UtcNow;
        order.PaymentClaimedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        // Exactly one owner email per claim: a second call is refused above.
        _notifier.NotifyOwner(order, OrderEmailEvent.InternalReceiptUploaded);
        return Ok(await MapAsync(order, ct));
    }

    public static string? NormalizeChoice(string? raw) => raw?.Trim().ToLowerInvariant() switch
    {
        "transfer" => "Transfer",
        "pickup" => "Pickup",
        _ => null,
    };

    public static bool CanChoosePayment(string status) => PaymentChoiceStatuses.Contains(status);

    private async Task<Order?> FindAsync(string token, bool asNoTracking, CancellationToken ct)
    {
        if (!OrderPublicIdentifiers.LooksLikeStatusToken(token))
            return null;

        var query = _context.Orders.AsQueryable();
        if (asNoTracking)
            query = query.AsNoTracking();

        return await query
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                    .ThenInclude(p => p!.ProductImages)
            .FirstOrDefaultAsync(o => o.StatusToken == token && !o.IsVoid, ct);
    }

    private async Task<PublicOrderStatusDto> MapAsync(Order order, CancellationToken ct)
    {
        var lines = order.OrderItems.OrderBy(i => i.Id).ToList();

        // Ukrainian names are not stored on the line (it keeps the English name it was ordered with),
        // so they are looked up by name in the catalogue.
        var colorNames = lines.Select(i => i.ColorName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var sizeNames = lines.Select(i => i.SizeName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var furnitureNames = lines.Select(i => i.FurnitureColorName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        var colorUk = await _context.Colors.AsNoTracking()
            .Where(c => colorNames.Contains(c.Name) && c.NameUk != null)
            .ToDictionaryAsync(c => c.Name, c => c.NameUk!, ct);
        var sizeUk = await _context.Sizes.AsNoTracking()
            .Where(s => sizeNames.Contains(s.Name) && s.NameUk != null)
            .ToDictionaryAsync(s => s.Name, s => s.NameUk!, ct);
        var furnitureUk = await _context.FurnitureColors.AsNoTracking()
            .Where(f => furnitureNames.Contains(f.Name) && f.NameUk != null)
            .ToDictionaryAsync(f => f.Name, f => f.NameUk!, ct);

        var email = order.Customer?.Email ?? order.GuestEmail;
        var accountExists = order.CustomerId == null
            && !string.IsNullOrWhiteSpace(order.GuestEmail)
            && await _context.Customers.AsNoTracking()
                .AnyAsync(c => c.Email.ToLower() == order.GuestEmail!.ToLower(), ct);

        var apiBase = ResolvePublicApiBaseUrl().TrimEnd('/');
        var locale = OrderLinks.LocaleOf(order);

        return new PublicOrderStatusDto
        {
            OrderNumber = order.OrderNumber,
            OrderDate = order.OrderDate,
            Status = order.Status,
            CurrencyCode = order.CurrencyCode,
            Total = order.TotalCents / 100m,
            EurTotal = lines.Any(i => !i.EurUnitPrice.HasValue) ? null : lines.Sum(i => i.EurUnitPrice!.Value * i.Quantity),
            Locale = order.Locale,
            RecipientFirstName = order.RecipientFirstName,
            DeliveryCityName = order.DeliveryCityName,
            DeliveryWarehouseName = order.DeliveryWarehouseName,
            TtnNumber = order.TtnNumber,
            TrackingStatus = order.TrackingStatus,
            IsForeignDelivery = order.IsForeignDelivery,
            DeliveryCountryName = order.DeliveryCountryName,
            DeliveryCarrier = order.DeliveryCarrier,
            DeliveryPostalCode = order.DeliveryPostalCode,
            DeliveryAddress = order.DeliveryAddress,
            PaymentReceivedAt = order.PaymentReceivedAt,
            ReceiptUploadedAt = order.ReceiptKey == null ? null : order.ReceiptUploadedAt,
            PaymentClaimedAt = order.PaymentClaimedAt,
            CanClaimPayment = order.PaymentChoice == "Transfer" && PaymentChoiceStatuses.Contains(order.Status) && order.PaymentReceivedAt == null && order.PaymentClaimedAt == null,
            PaymentChoice = order.PaymentChoice,
            PaymentChoiceAt = order.PaymentChoiceAt,
            CanChoosePayment = CanChoosePayment(order.Status),
            TransferDetails = order.PaymentChoice == "Transfer" ? await ReadTransferDetailsAsync(order, ct) : null,
            CancelReason = order.CancelReason,
            Email = email,
            IsAttachedToAccount = order.CustomerId != null,
            AccountExistsForEmail = accountExists,
            Items = lines
                .Select(i => new PublicOrderStatusItemDto
                {
                    ProductCode = OrderItemSnapshotHelper.ResolveProductCode(i),
                    ProductName = OrderItemSnapshotHelper.ResolveProductName(i),
                    ProductImageUrl = AbsoluteUrl(OrderItemSnapshotHelper.ResolveProductImageUrl(i), apiBase),
                    ColorName = i.ColorName,
                    ColorNameUk = i.ColorName != null && colorUk.TryGetValue(i.ColorName, out var cu) ? cu : null,
                    SizeName = i.SizeName,
                    SizeNameUk = i.SizeName != null && sizeUk.TryGetValue(i.SizeName, out var su) ? su : null,
                    WithLace = OrderItemSnapshotHelper.ResolveWithLace(i),
                    FurnitureColorName = i.FurnitureColorName,
                    FurnitureColorNameUk = i.FurnitureColorName != null && furnitureUk.TryGetValue(i.FurnitureColorName, out var fu) ? fu : null,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.UnitPrice * i.Quantity,
                    EurUnitPrice = i.EurUnitPrice,
                    EurLineTotal = i.EurUnitPrice.HasValue ? i.EurUnitPrice * i.Quantity : null,
                })
                .ToList(),
        };
    }

    /// <summary>The bank-transfer details the owner typed in the admin (yarne.payment.v1); null while they have none.</summary>
    private async Task<TransferDetailsDto?> ReadTransferDetailsAsync(Order order, CancellationToken ct)
    {
        var json = await _settings.GetValueJsonAsync(PaymentSettingKey, ct);
        return ExtractTransferDetails(json, order.OrderNumber ?? $"#{order.Id}");
    }

    /// <summary>
    /// Reads { "recipient", "cardNumber", "iban", "reference" }. The reference is the owner's text with {{order}} replaced by the order
    /// number; empty text means just the order number. Null when there is neither a recipient nor a card number.
    /// </summary>
    public static TransferDetailsDto? ExtractTransferDetails(string? valueJson, string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(valueJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(valueJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return null;

            string Text(string key) =>
                doc.RootElement.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.String
                    ? el.GetString()?.Trim() ?? string.Empty
                    : string.Empty;

            var recipient = Text("recipient");
            var card = Text("cardNumber");
            if (recipient.Length == 0 && card.Length == 0)
                return null;

            return new TransferDetailsDto
            {
                Recipient = recipient,
                CardNumber = card,
                Iban = Text("iban"),
                Reference = ResolveReference(Text("reference"), orderNumber),
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// The payment note the customer is told to write: the owner's text with the order number put where {{order}} stands (in any
    /// spacing or letter case). Anything else in double braces never reaches the customer. Empty text means no row at all.
    /// </summary>
    public static string ResolveReference(string? template, string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(template))
            return string.Empty;

        var filled = System.Text.RegularExpressions.Regex.Replace(template, @"\{\{\s*order\s*\}\}", orderNumber.Replace("$", "$$"), System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        filled = System.Text.RegularExpressions.Regex.Replace(filled, @"\{\{[^}]*\}\}", string.Empty);
        return System.Text.RegularExpressions.Regex.Replace(filled, @"\s+", " ").Trim();
    }

    private string ResolvePublicApiBaseUrl()
    {
        var configured = _configuration["PUBLIC_API_BASE_URL"]
            ?? Environment.GetEnvironmentVariable("PUBLIC_API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.Trim();

        var req = HttpContext?.Request;
        if (req == null) return "https://mindful-flexibility-production.up.railway.app";
        return $"{req.Scheme}://{req.Host.Value}";
    }

    private static string? AbsoluteUrl(string? raw, string apiBase)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim();
        if (Uri.TryCreate(value, UriKind.Absolute, out _))
            return value;
        if (!value.StartsWith("/", StringComparison.Ordinal))
            value = "/" + value;
        return apiBase + value;
    }
}
