using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting")]
[Authorize(Roles = "Admin")]
public sealed class AccountingProcurementController : ControllerBase
{
    private readonly IProcurementService _procurement;
    private readonly CloudinaryUploadSignatureService _cloudinary;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingProcurementController(
        IProcurementService procurement,
        CloudinaryUploadSignatureService cloudinary,
        IAdminActivityLogService activityLogs)
    {
        _procurement = procurement;
        _cloudinary = cloudinary;
        _activityLogs = activityLogs;
    }

    [HttpGet("currencies")]
    public async Task<ActionResult<IReadOnlyList<CurrencyDto>>> GetCurrencies(CancellationToken ct)
    {
        return Ok(await _procurement.GetCurrenciesAsync(ct));
    }

    [HttpGet("exchange-rates")]
    public async Task<ActionResult<IReadOnlyList<ExchangeRateDto>>> GetExchangeRates(CancellationToken ct)
    {
        return Ok(await _procurement.GetExchangeRatesAsync(ct));
    }

    [HttpPost("exchange-rates")]
    public async Task<ActionResult<ExchangeRateDto>> SetExchangeRate(
        [FromBody] SetExchangeRateRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _procurement.SetExchangeRateAsync(request, actorId, ct);
            await _activityLogs.LogAsync(
                "accounting",
                "created",
                $"Set {result.FromCurrencyCode}/{result.ToCurrencyCode} rate to {result.Rate}",
                entityId: result.Id.ToString(),
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return CreatedAtAction(nameof(GetExchangeRates), result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("suppliers")]
    public async Task<ActionResult<IReadOnlyList<SupplierDto>>> GetSuppliers(CancellationToken ct)
    {
        return Ok(await _procurement.GetSuppliersAsync(ct));
    }

    [HttpGet("suppliers/{id:int}")]
    public async Task<ActionResult<SupplierDto>> GetSupplier(int id, CancellationToken ct)
    {
        var result = await _procurement.GetSupplierAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("suppliers")]
    public async Task<ActionResult<SupplierDto>> CreateSupplier(
        [FromBody] SaveSupplierRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _procurement.CreateSupplierAsync(request, actorId, ct);
            await _activityLogs.LogAsync(
                "accounting",
                "created",
                $"Created supplier '{result.Name}'",
                entityId: result.Id.ToString(),
                entityLabel: result.Name,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return CreatedAtAction(nameof(GetSupplier), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("suppliers/{id:int}")]
    public async Task<ActionResult<SupplierDto>> UpdateSupplier(
        int id,
        [FromBody] SaveSupplierRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _procurement.UpdateSupplierAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Updated supplier '{result.Name}'",
                entityId: id.ToString(),
                entityLabel: result.Name,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("suppliers/{id:int}")]
    public async Task<IActionResult> VoidSupplier(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _procurement.VoidSupplierAsync(id, actorId, ct))
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "voided",
                $"Voided supplier #{id}",
                entityId: id.ToString(),
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("purchase-orders")]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderDto>>> GetPurchaseOrders(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        return Ok(await _procurement.GetPurchaseOrdersAsync(from, to, ct));
    }

    [HttpGet("purchase-orders/{id:int}")]
    public async Task<ActionResult<PurchaseOrderDto>> GetPurchaseOrder(int id, CancellationToken ct)
    {
        var result = await _procurement.GetPurchaseOrderAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("purchase-orders")]
    public async Task<ActionResult<PurchaseOrderDto>> CreatePurchaseOrder(
        [FromBody] SavePurchaseOrderRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _procurement.CreatePurchaseOrderAsync(request, actorId, ct);
            await _activityLogs.LogAsync(
                "accounting",
                "created",
                $"Created purchase order #{result.Id} for {result.SupplierName}",
                entityId: result.Id.ToString(),
                entityLabel: result.InvoiceRef,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The purchase order total is too large." });
        }
    }

    [HttpPut("purchase-orders/{id:int}")]
    public async Task<ActionResult<PurchaseOrderDto>> UpdatePurchaseOrder(
        int id,
        [FromBody] SavePurchaseOrderRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _procurement.UpdatePurchaseOrderAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Updated purchase order #{id}",
                entityId: id.ToString(),
                entityLabel: result.InvoiceRef,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The purchase order total is too large." });
        }
    }

    [HttpDelete("purchase-orders/{id:int}")]
    public async Task<IActionResult> VoidPurchaseOrder(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _procurement.VoidPurchaseOrderAsync(id, actorId, ct))
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "voided",
                $"Voided purchase order #{id}",
                entityId: id.ToString(),
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("uploads/cloudinary-signature")]
    public ActionResult<CloudinaryUploadSignatureDto> CreateCloudinarySignature()
    {
        try
        {
            return Ok(_cloudinary.Create());
        }
        catch (InvalidOperationException)
        {
            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Receipt upload is not configured.",
                detail: "Configure Cloudinary credentials on the API and try again.");
        }
    }
}
