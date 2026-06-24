using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Data;

namespace YarneAPIBack.Accounting.Services;

public class AccountingService : IAccountingService
{
    private readonly YarneDbContext _context;

    public AccountingService(YarneDbContext context)
    {
        _context = context;
    }

    // ─── Categories ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<AccountingCategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var rows = await _context.AccountingCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return rows.Select(MapCategory).ToList();
    }

    public async Task<AccountingCategoryDto?> GetCategoryByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.AccountingCategories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        return row == null ? null : MapCategory(row);
    }

    public async Task<AccountingCategoryDto> CreateCategoryAsync(CreateAccountingCategoryRequest req, CancellationToken ct = default)
    {
        var entity = new AccountingCategory
        {
            Name = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        _context.AccountingCategories.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapCategory(entity);
    }

    public async Task<AccountingCategoryDto?> UpdateCategoryAsync(int id, UpdateAccountingCategoryRequest req, CancellationToken ct = default)
    {
        var entity = await _context.AccountingCategories.FindAsync([id], ct);
        if (entity == null)
            return null;

        entity.Name = req.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        await _context.SaveChangesAsync(ct);
        return MapCategory(entity);
    }

    public async Task<bool> DeleteCategoryAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.AccountingCategories.FindAsync([id], ct);
        if (entity == null)
            return false;

        _context.AccountingCategories.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ─── Purchases ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<AccountingPurchaseDto>> GetPurchasesAsync(int? categoryId = null, CancellationToken ct = default)
    {
        var query = _context.AccountingPurchases
            .AsNoTracking()
            .Include(p => p.Category)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        var rows = await query.OrderByDescending(p => p.PurchaseDate).ToListAsync(ct);
        return rows.Select(MapPurchase).ToList();
    }

    public async Task<AccountingPurchaseDto?> GetPurchaseByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.AccountingPurchases
            .AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        return row == null ? null : MapPurchase(row);
    }

    public async Task<AccountingPurchaseDto> CreatePurchaseAsync(CreateAccountingPurchaseRequest req, CancellationToken ct = default)
    {
        var entity = new AccountingPurchase
        {
            CategoryId = req.CategoryId,
            Name = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Supplier = string.IsNullOrWhiteSpace(req.Supplier) ? null : req.Supplier.Trim(),
            PurchaseDate = req.PurchaseDate.ToUniversalTime(),
            ReceivedDate = req.ReceivedDate?.ToUniversalTime(),
            SoldDate = req.SoldDate?.ToUniversalTime(),
            Quantity = req.Quantity,
            QuantitySold = req.QuantitySold,
            UnitCost = req.UnitCost,
            SaleUnitPrice = req.SaleUnitPrice,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        _context.AccountingPurchases.Add(entity);
        await _context.SaveChangesAsync(ct);

        await _context.Entry(entity).Reference(e => e.Category).LoadAsync(ct);
        return MapPurchase(entity);
    }

    public async Task<AccountingPurchaseDto?> UpdatePurchaseAsync(int id, UpdateAccountingPurchaseRequest req, CancellationToken ct = default)
    {
        var entity = await _context.AccountingPurchases
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity == null)
            return null;

        entity.CategoryId = req.CategoryId;
        entity.Name = req.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        entity.Supplier = string.IsNullOrWhiteSpace(req.Supplier) ? null : req.Supplier.Trim();
        entity.PurchaseDate = req.PurchaseDate.ToUniversalTime();
        entity.ReceivedDate = req.ReceivedDate?.ToUniversalTime();
        entity.SoldDate = req.SoldDate?.ToUniversalTime();
        entity.Quantity = req.Quantity;
        entity.QuantitySold = req.QuantitySold;
        entity.UnitCost = req.UnitCost;
        entity.SaleUnitPrice = req.SaleUnitPrice;
        entity.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        await _context.SaveChangesAsync(ct);

        if (entity.CategoryId != req.CategoryId)
            await _context.Entry(entity).Reference(e => e.Category).LoadAsync(ct);

        return MapPurchase(entity);
    }

    public async Task<bool> DeletePurchaseAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.AccountingPurchases.FindAsync([id], ct);
        if (entity == null)
            return false;

        _context.AccountingPurchases.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ─── Marketing ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MarketingExpenditureDto>> GetMarketingAsync(CancellationToken ct = default)
    {
        var rows = await _context.MarketingExpenditures
            .AsNoTracking()
            .OrderByDescending(m => m.ExpenseDate)
            .ToListAsync(ct);
        return rows.Select(MapMarketing).ToList();
    }

    public async Task<MarketingExpenditureDto?> GetMarketingByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.MarketingExpenditures.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct);
        return row == null ? null : MapMarketing(row);
    }

    public async Task<MarketingExpenditureDto> CreateMarketingAsync(CreateMarketingExpenditureRequest req, CancellationToken ct = default)
    {
        var entity = new MarketingExpenditure
        {
            Name = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Amount = req.Amount,
            ExpenseDate = req.ExpenseDate.ToUniversalTime(),
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        _context.MarketingExpenditures.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapMarketing(entity);
    }

    public async Task<MarketingExpenditureDto?> UpdateMarketingAsync(int id, UpdateMarketingExpenditureRequest req, CancellationToken ct = default)
    {
        var entity = await _context.MarketingExpenditures.FindAsync([id], ct);
        if (entity == null)
            return null;

        entity.Name = req.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        entity.Amount = req.Amount;
        entity.ExpenseDate = req.ExpenseDate.ToUniversalTime();
        entity.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        await _context.SaveChangesAsync(ct);
        return MapMarketing(entity);
    }

    public async Task<bool> DeleteMarketingAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.MarketingExpenditures.FindAsync([id], ct);
        if (entity == null)
            return false;

        _context.MarketingExpenditures.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────

    public async Task<AccountingDashboardDto> GetDashboardAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var fromUtc = from?.ToUniversalTime();
        var toUtc = to?.ToUniversalTime();

        var orderQuery = _context.Orders.AsNoTracking().Where(o => o.Status != "Cancelled");
        if (fromUtc.HasValue) orderQuery = orderQuery.Where(o => o.OrderDate >= fromUtc.Value);
        if (toUtc.HasValue)   orderQuery = orderQuery.Where(o => o.OrderDate <= toUtc.Value);

        var orderRevenue = await orderQuery.SumAsync(o => (decimal?)o.Total, ct) ?? 0m;
        var totalOrders  = await orderQuery.CountAsync(ct);

        var purchaseQuery = _context.AccountingPurchases.AsNoTracking();
        if (fromUtc.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= fromUtc.Value);
        if (toUtc.HasValue)   purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= toUtc.Value);
        var purchaseSpend = await purchaseQuery.SumAsync(p => (decimal?)(p.Quantity * p.UnitCost), ct) ?? 0m;

        var soldQuery = _context.AccountingPurchases.AsNoTracking().Where(p => p.SoldDate != null);
        if (fromUtc.HasValue) soldQuery = soldQuery.Where(p => p.SoldDate >= fromUtc.Value);
        if (toUtc.HasValue)   soldQuery = soldQuery.Where(p => p.SoldDate <= toUtc.Value);
        var manualRevenue = await soldQuery.SumAsync(p => (decimal?)(p.QuantitySold * (p.SaleUnitPrice ?? 0m)), ct) ?? 0m;

        var marketingQuery = _context.MarketingExpenditures.AsNoTracking();
        if (fromUtc.HasValue) marketingQuery = marketingQuery.Where(m => m.ExpenseDate >= fromUtc.Value);
        if (toUtc.HasValue)   marketingQuery = marketingQuery.Where(m => m.ExpenseDate <= toUtc.Value);
        var marketingSpend = await marketingQuery.SumAsync(m => (decimal?)m.Amount, ct) ?? 0m;

        var allPurchases = await _context.AccountingPurchases.AsNoTracking()
            .Where(p => p.Quantity > p.QuantitySold)
            .ToListAsync(ct);

        var remainingItems = allPurchases.Count;
        var remainingValue = allPurchases.Sum(p => (p.Quantity - p.QuantitySold) * p.UnitCost);

        var totalRevenue = orderRevenue + manualRevenue;
        var totalSpent   = purchaseSpend + marketingSpend;

        return new AccountingDashboardDto
        {
            DateFrom = from,
            DateTo   = to,
            OrderRevenue          = orderRevenue,
            ManualSaleRevenue     = manualRevenue,
            TotalRevenue          = totalRevenue,
            PurchaseSpend         = purchaseSpend,
            MarketingSpend        = marketingSpend,
            TotalSpent            = totalSpent,
            Net                   = totalRevenue - totalSpent,
            TotalOrdersSold       = totalOrders,
            RemainingInventoryItems = remainingItems,
            RemainingInventoryValue = remainingValue,
        };
    }

    // ─── Report ──────────────────────────────────────────────────────────────

    public async Task<AccountingReportDto> GetReportAsync(AccountingReportRequest req, CancellationToken ct = default)
    {
        var fromUtc = req.From?.ToUniversalTime();
        var toUtc   = req.To?.ToUniversalTime();

        var report = new AccountingReportDto
        {
            DateFrom = req.From,
            DateTo   = req.To,
        };

        // Orders
        if (req.IncludeOrders)
        {
            var orderQuery = _context.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Where(o => o.Status != "Cancelled");
            if (fromUtc.HasValue) orderQuery = orderQuery.Where(o => o.OrderDate >= fromUtc.Value);
            if (toUtc.HasValue)   orderQuery = orderQuery.Where(o => o.OrderDate <= toUtc.Value);

            var orders = await orderQuery.OrderByDescending(o => o.OrderDate).ToListAsync(ct);
            report.OrderRevenue = orders.Sum(o => o.Total);
            report.Orders = orders.Select(o => new ReportOrderLineDto
            {
                OrderId      = o.Id,
                OrderDate    = o.OrderDate,
                Status       = o.Status,
                Total        = o.Total,
                CustomerName = $"{o.Customer.FirstName} {o.Customer.LastName}".Trim(),
            }).ToList();
        }

        // Purchases
        if (req.IncludePurchases)
        {
            var purchaseQuery = _context.AccountingPurchases
                .AsNoTracking()
                .Include(p => p.Category)
                .AsQueryable();
            if (fromUtc.HasValue) purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate >= fromUtc.Value);
            if (toUtc.HasValue)   purchaseQuery = purchaseQuery.Where(p => p.PurchaseDate <= toUtc.Value);
            if (req.CategoryIds is { Count: > 0 })
                purchaseQuery = purchaseQuery.Where(p => req.CategoryIds.Contains(p.CategoryId));

            var purchases = await purchaseQuery.ToListAsync(ct);
            report.PurchaseSpend = purchases.Sum(p => p.Quantity * p.UnitCost);

            report.PurchasesByCategory = purchases
                .GroupBy(p => new { p.CategoryId, p.Category.Name })
                .OrderBy(g => g.Key.Name)
                .Select(g => new ReportCategoryBreakdownDto
                {
                    CategoryId   = g.Key.CategoryId,
                    CategoryName = g.Key.Name,
                    TotalCost    = g.Sum(p => p.Quantity * p.UnitCost),
                    TotalSaleRevenue = g.Sum(p => p.QuantitySold * (p.SaleUnitPrice ?? 0m)),
                    Items = g.OrderBy(p => p.PurchaseDate).Select(p => new ReportPurchaseLineDto
                    {
                        PurchaseId   = p.Id,
                        Name         = p.Name,
                        Supplier     = p.Supplier,
                        PurchaseDate = p.PurchaseDate,
                        Quantity     = p.Quantity,
                        QuantitySold = p.QuantitySold,
                        UnitCost     = p.UnitCost,
                        SaleUnitPrice = p.SaleUnitPrice,
                        TotalCost    = p.Quantity * p.UnitCost,
                        SaleRevenue  = p.QuantitySold * (p.SaleUnitPrice ?? 0m),
                    }).ToList(),
                }).ToList();
        }

        // Marketing
        if (req.IncludeMarketing)
        {
            var marketingQuery = _context.MarketingExpenditures.AsNoTracking().AsQueryable();
            if (fromUtc.HasValue) marketingQuery = marketingQuery.Where(m => m.ExpenseDate >= fromUtc.Value);
            if (toUtc.HasValue)   marketingQuery = marketingQuery.Where(m => m.ExpenseDate <= toUtc.Value);

            var items = await marketingQuery.OrderByDescending(m => m.ExpenseDate).ToListAsync(ct);
            report.MarketingSpend = items.Sum(m => m.Amount);
            report.MarketingItems = items.Select(m => new ReportMarketingLineDto
            {
                Id          = m.Id,
                Name        = m.Name,
                Amount      = m.Amount,
                ExpenseDate = m.ExpenseDate,
                Description = m.Description,
            }).ToList();
        }

        // Manual sale revenue from purchases with SoldDate in range
        var soldQuery = _context.AccountingPurchases.AsNoTracking().Where(p => p.SoldDate != null);
        if (fromUtc.HasValue) soldQuery = soldQuery.Where(p => p.SoldDate >= fromUtc.Value);
        if (toUtc.HasValue)   soldQuery = soldQuery.Where(p => p.SoldDate <= toUtc.Value);
        if (req.CategoryIds is { Count: > 0 })
            soldQuery = soldQuery.Where(p => req.CategoryIds.Contains(p.CategoryId));
        report.ManualSaleRevenue = await soldQuery.SumAsync(p => (decimal?)(p.QuantitySold * (p.SaleUnitPrice ?? 0m)), ct) ?? 0m;

        // Remaining inventory
        var inventoryQuery = _context.AccountingPurchases
            .AsNoTracking()
            .Include(p => p.Category)
            .Where(p => p.Quantity > p.QuantitySold);
        if (req.CategoryIds is { Count: > 0 })
            inventoryQuery = inventoryQuery.Where(p => req.CategoryIds.Contains(p.CategoryId));

        var inventory = await inventoryQuery.ToListAsync(ct);
        report.RemainingInventory = inventory.Select(p => new ReportInventoryItemDto
        {
            PurchaseId        = p.Id,
            Name              = p.Name,
            CategoryName      = p.Category.Name,
            QuantityRemaining = p.Quantity - p.QuantitySold,
            UnitCost          = p.UnitCost,
            RemainingValue    = (p.Quantity - p.QuantitySold) * p.UnitCost,
        }).ToList();

        report.TotalRevenue = report.OrderRevenue + report.ManualSaleRevenue;
        report.TotalSpent   = report.PurchaseSpend + report.MarketingSpend;
        report.Net          = report.TotalRevenue - report.TotalSpent;

        return report;
    }

    // ─── Mappers ─────────────────────────────────────────────────────────────

    private static AccountingCategoryDto MapCategory(AccountingCategory c) => new()
    {
        Id          = c.Id,
        Name        = c.Name,
        Description = c.Description,
        CreatedAt   = c.CreatedAt,
    };

    private static AccountingPurchaseDto MapPurchase(AccountingPurchase p) => new()
    {
        Id             = p.Id,
        CategoryId     = p.CategoryId,
        CategoryName   = p.Category?.Name ?? string.Empty,
        Name           = p.Name,
        Description    = p.Description,
        Supplier       = p.Supplier,
        PurchaseDate   = p.PurchaseDate,
        ReceivedDate   = p.ReceivedDate,
        SoldDate       = p.SoldDate,
        Quantity       = p.Quantity,
        QuantitySold   = p.QuantitySold,
        UnitCost       = p.UnitCost,
        SaleUnitPrice  = p.SaleUnitPrice,
        Notes          = p.Notes,
        CreatedAt      = p.CreatedAt,
    };

    private static MarketingExpenditureDto MapMarketing(MarketingExpenditure m) => new()
    {
        Id          = m.Id,
        Name        = m.Name,
        Description = m.Description,
        Amount      = m.Amount,
        ExpenseDate = m.ExpenseDate,
        Notes       = m.Notes,
        CreatedAt   = m.CreatedAt,
    };
}
