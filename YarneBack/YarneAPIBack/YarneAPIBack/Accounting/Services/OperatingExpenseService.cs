using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public sealed class OperatingExpenseService : IOperatingExpenseService
{
    private readonly YarneDbContext _db;

    public OperatingExpenseService(YarneDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<OperatingExpenseCategoryDto>> GetCategoriesAsync(
        CancellationToken ct = default)
    {
        var rows = await _db.OperatingExpenseCategories
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        return rows.Select(MapCategory).ToList();
    }

    public async Task<OperatingExpenseCategoryDto> CreateCategoryAsync(
        SaveOperatingExpenseCategoryRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var name = ValidateCategoryName(request.Name);
        if (await _db.OperatingExpenseCategories.AnyAsync(x => !x.IsVoid && x.Name == name, ct))
            throw new AccountingBusinessException($"Expense category '{name}' already exists.");
        var now = DateTime.UtcNow;
        var entity = new OperatingExpenseCategory
        {
            Name = name,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.OperatingExpenseCategories.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapCategory(entity);
    }

    public async Task<OperatingExpenseCategoryDto?> UpdateCategoryAsync(
        int id,
        SaveOperatingExpenseCategoryRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        var entity = await _db.OperatingExpenseCategories
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return null;
        var name = ValidateCategoryName(request.Name);
        if (await _db.OperatingExpenseCategories.AnyAsync(
                x => !x.IsVoid && x.Id != id && x.Name == name,
                ct))
        {
            throw new AccountingBusinessException($"Expense category '{name}' already exists.");
        }
        entity.Name = name;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return MapCategory(entity);
    }

    public async Task<bool> VoidCategoryAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var entity = await _db.OperatingExpenseCategories
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        if (await _db.OperatingExpenses.AnyAsync(x => x.CategoryId == id && !x.IsVoid, ct))
            throw new AccountingBusinessException("This category is used by expenses and cannot be voided.");
        entity.IsVoid = true;
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<OperatingExpenseDto>> GetExpensesAsync(
        DateTime? from,
        DateTime? to,
        int? categoryId,
        CancellationToken ct = default)
    {
        var query = ExpenseQuery();
        if (from.HasValue)
            query = query.Where(x => x.Date >= EnsureUtc(from.Value));
        if (to.HasValue)
            query = query.Where(x => x.Date <= EnsureUtc(to.Value));
        if (categoryId.HasValue)
            query = query.Where(x => x.CategoryId == categoryId.Value);
        var rows = await query.OrderByDescending(x => x.Date).ThenByDescending(x => x.Id).ToListAsync(ct);
        return rows.Select(MapExpense).ToList();
    }

    public async Task<OperatingExpenseDto?> GetExpenseAsync(int id, CancellationToken ct = default)
    {
        var entity = await ExpenseQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : MapExpense(entity);
    }

    public async Task<OperatingExpenseDto> CreateExpenseAsync(
        SaveOperatingExpenseRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateExpense(request);
        await EnsureCategoryAsync(request.CategoryId, ct);
        var currency = NormalizeCurrency(request.CurrencyCode);
        var date = EnsureUtc(request.Date);
        var rate = await ResolveRateAsync(currency, request.ExchangeRateToBase, date, ct);
        var now = DateTime.UtcNow;
        var entity = new OperatingExpense
        {
            CategoryId = request.CategoryId,
            Date = date,
            AmountCents = request.AmountCents,
            VatAmountCents = request.VatAmountCents,
            BaseAmountCents = RoundToCents(request.AmountCents * rate),
            BaseVatAmountCents = RoundToCents(request.VatAmountCents * rate),
            CurrencyCode = currency,
            ExchangeRateToBase = rate,
            Vendor = Optional(request.Vendor, 255),
            Description = Optional(request.Description, 2000),
            PaymentMethod = Optional(request.PaymentMethod, 100),
            ReceiptUrl = ValidateReceiptUrl(request.ReceiptUrl),
            Status = "posted",
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.OperatingExpenses.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (await GetExpenseAsync(entity.Id, ct))!;
    }

    public async Task<OperatingExpenseDto?> UpdateExpenseAsync(
        int id,
        SaveOperatingExpenseRequest request,
        int? actorId,
        CancellationToken ct = default)
    {
        ValidateExpense(request);
        var entity = await _db.OperatingExpenses.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return null;
        await EnsureCategoryAsync(request.CategoryId, ct);
        var currency = NormalizeCurrency(request.CurrencyCode);
        var date = EnsureUtc(request.Date);
        var rate = await ResolveRateAsync(currency, request.ExchangeRateToBase, date, ct);

        entity.CategoryId = request.CategoryId;
        entity.Date = date;
        entity.AmountCents = request.AmountCents;
        entity.VatAmountCents = request.VatAmountCents;
        entity.BaseAmountCents = RoundToCents(request.AmountCents * rate);
        entity.BaseVatAmountCents = RoundToCents(request.VatAmountCents * rate);
        entity.CurrencyCode = currency;
        entity.ExchangeRateToBase = rate;
        entity.Vendor = Optional(request.Vendor, 255);
        entity.Description = Optional(request.Description, 2000);
        entity.PaymentMethod = Optional(request.PaymentMethod, 100);
        entity.ReceiptUrl = ValidateReceiptUrl(request.ReceiptUrl);
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetExpenseAsync(id, ct);
    }

    public async Task<bool> VoidExpenseAsync(int id, int? actorId, CancellationToken ct = default)
    {
        var entity = await _db.OperatingExpenses.SingleOrDefaultAsync(x => x.Id == id && !x.IsVoid, ct);
        if (entity is null)
            return false;
        entity.IsVoid = true;
        entity.Status = "cancelled";
        entity.CreatedBy ??= actorId;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private IQueryable<OperatingExpense> ExpenseQuery() =>
        _db.OperatingExpenses
            .AsNoTracking()
            .Where(x => !x.IsVoid)
            .Include(x => x.Category);

    private async Task<decimal> ResolveRateAsync(
        string currency,
        decimal? supplied,
        DateTime date,
        CancellationToken ct)
    {
        var baseCode = await _db.AccountingCurrencies
            .Where(x => x.IsBase && x.IsActive && !x.IsVoid)
            .Select(x => x.Code)
            .SingleAsync(ct);
        if (currency == baseCode)
            return 1m;
        if (supplied.HasValue)
        {
            if (supplied.Value <= 0)
                throw new AccountingBusinessException("Exchange rate must be greater than zero.");
            return decimal.Round(supplied.Value, 8, MidpointRounding.AwayFromZero);
        }
        return await _db.CurrencyExchangeRates
            .Where(x =>
                !x.IsVoid &&
                x.FromCurrencyCode == currency &&
                x.ToCurrencyCode == baseCode &&
                x.EffectiveAt <= date)
            .OrderByDescending(x => x.EffectiveAt)
            .Select(x => (decimal?)x.Rate)
            .FirstOrDefaultAsync(ct)
            ?? throw new AccountingBusinessException(
                $"Set a {currency}/{baseCode} exchange rate for the expense date.");
    }

    private async Task EnsureCategoryAsync(int id, CancellationToken ct)
    {
        if (!await _db.OperatingExpenseCategories.AnyAsync(x => x.Id == id && !x.IsVoid, ct))
            throw new AccountingBusinessException("Expense category was not found.");
    }

    private static OperatingExpenseCategoryDto MapCategory(OperatingExpenseCategory entity) =>
        new(entity.Id, entity.Name, entity.CreatedAt, entity.UpdatedAt);

    private static OperatingExpenseDto MapExpense(OperatingExpense entity) =>
        new(
            entity.Id,
            entity.CategoryId,
            entity.Category.Name,
            entity.Date,
            entity.AmountCents,
            entity.VatAmountCents,
            entity.BaseAmountCents,
            entity.BaseVatAmountCents,
            entity.CurrencyCode,
            entity.ExchangeRateToBase,
            entity.Vendor,
            entity.Description,
            entity.PaymentMethod,
            entity.ReceiptUrl,
            entity.Status,
            entity.CreatedAt,
            entity.UpdatedAt);

    private static void ValidateExpense(SaveOperatingExpenseRequest request)
    {
        if (request.CategoryId <= 0)
            throw new AccountingBusinessException("Choose an expense category.");
        if (request.AmountCents < 0 || request.VatAmountCents < 0)
            throw new AccountingBusinessException("Amount and VAT cannot be negative.");
        if (request.VatAmountCents > request.AmountCents)
            throw new AccountingBusinessException("VAT cannot exceed the expense amount.");
    }

    private static string ValidateCategoryName(string value)
    {
        var name = value?.Trim() ?? string.Empty;
        if (name.Length is 0 or > 100)
            throw new AccountingBusinessException("Category name is required and cannot exceed 100 characters.");
        return name;
    }

    private static string NormalizeCurrency(string value)
    {
        var code = value?.Trim().ToUpperInvariant() ?? string.Empty;
        if (code.Length != 3)
            throw new AccountingBusinessException("Currency must be a 3-letter code.");
        return code;
    }

    private static string? Optional(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
            return null;
        if (normalized.Length > maxLength)
            throw new AccountingBusinessException($"Value cannot exceed {maxLength} characters.");
        return normalized;
    }

    private static string? ValidateReceiptUrl(string? value)
    {
        var normalized = Optional(value, 2048);
        if (normalized is null)
            return null;
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            !uri.Host.EndsWith("cloudinary.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new AccountingBusinessException("Receipt must be a secure Cloudinary URL.");
        }
        return normalized;
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        if (value == default)
            throw new AccountingBusinessException("Expense date is required.");
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    private static long RoundToCents(decimal value) =>
        checked((long)decimal.Round(value, 0, MidpointRounding.AwayFromZero));
}
