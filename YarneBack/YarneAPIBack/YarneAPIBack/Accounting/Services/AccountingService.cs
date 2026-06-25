using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting;
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

    // ─── Materials ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MaterialDto>> GetMaterialsAsync(bool? isActive = null, CancellationToken ct = default)
    {
        var query = _context.Materials.AsNoTracking().AsQueryable();
        if (isActive.HasValue)
            query = query.Where(m => m.IsActive == isActive.Value);

        var rows = await query.OrderBy(m => m.Name).ToListAsync(ct);
        return rows.Select(MapMaterial).ToList();
    }

    public async Task<MaterialDto?> GetMaterialByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.Materials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct);
        return row == null ? null : MapMaterial(row);
    }

    public async Task<MaterialDto> CreateMaterialAsync(CreateMaterialRequest req, CancellationToken ct = default)
    {
        var entity = new Material
        {
            Name        = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Unit        = string.IsNullOrWhiteSpace(req.Unit) ? "pcs" : req.Unit.Trim(),
            Sku         = string.IsNullOrWhiteSpace(req.Sku) ? null : req.Sku.Trim(),
            IsActive    = req.IsActive,
            CreatedAt   = DateTime.UtcNow,
        };
        _context.Materials.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapMaterial(entity);
    }

    public async Task<MaterialDto?> UpdateMaterialAsync(int id, UpdateMaterialRequest req, CancellationToken ct = default)
    {
        var entity = await _context.Materials.FindAsync([id], ct);
        if (entity == null) return null;

        entity.Name        = req.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        entity.Unit        = string.IsNullOrWhiteSpace(req.Unit) ? "pcs" : req.Unit.Trim();
        entity.Sku         = string.IsNullOrWhiteSpace(req.Sku) ? null : req.Sku.Trim();
        entity.IsActive    = req.IsActive;
        await _context.SaveChangesAsync(ct);
        return MapMaterial(entity);
    }

    public async Task<bool> DeleteMaterialAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.Materials.FindAsync([id], ct);
        if (entity == null) return false;

        _context.Materials.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<MaterialStockDto>> GetStockAsync(int? materialId = null, CancellationToken ct = default)
    {
        var materialQuery = _context.Materials.AsNoTracking().Where(m => m.IsActive);
        if (materialId.HasValue)
            materialQuery = materialQuery.Where(m => m.Id == materialId.Value);

        var materials = await materialQuery.OrderBy(m => m.Name).ToListAsync(ct);

        var importTotals = await _context.ImportTransactionLines
            .AsNoTracking()
            .GroupBy(l => l.MaterialId)
            .Select(g => new
            {
                MaterialId  = g.Key,
                TotalQty    = g.Sum(l => l.Quantity),
                TotalCost   = g.Sum(l => l.Quantity * l.UnitPrice),
            })
            .ToListAsync(ct);

        var usageTotals = await _context.MaterialUsageRecords
            .AsNoTracking()
            .GroupBy(u => u.MaterialId)
            .Select(g => new { MaterialId = g.Key, TotalUsed = g.Sum(u => u.QuantityUsed) })
            .ToListAsync(ct);

        var importMap = importTotals.ToDictionary(x => x.MaterialId);
        var usageMap  = usageTotals.ToDictionary(x => x.MaterialId);

        return materials.Select(m =>
        {
            importMap.TryGetValue(m.Id, out var imp);
            usageMap.TryGetValue(m.Id, out var use);
            var qtyImported = imp?.TotalQty ?? 0m;
            var qtyUsed     = use?.TotalUsed ?? 0m;
            var qtyOnHand   = qtyImported - qtyUsed;
            var avgUnitCost = qtyImported > 0 ? (imp?.TotalCost ?? 0m) / qtyImported : 0m;
            return new MaterialStockDto
            {
                MaterialId      = m.Id,
                Name            = m.Name,
                Unit            = m.Unit,
                Sku             = m.Sku,
                QtyImported     = qtyImported,
                QtyUsed         = qtyUsed,
                QtyOnHand       = qtyOnHand,
                AvgUnitCost     = avgUnitCost,
                TotalStockValue = qtyOnHand * avgUnitCost,
            };
        }).ToList();
    }

    // ─── Import Transactions ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<ImportTransactionSummaryDto>> GetImportTransactionsAsync(
        DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var fromUtc = from?.ToUniversalTime();
        var toUtc   = to?.ToUniversalTime();

        var query = _context.ImportTransactions
            .AsNoTracking()
            .Include(t => t.Lines)
            .AsQueryable();

        if (fromUtc.HasValue) query = query.Where(t => t.TransactionDate >= fromUtc.Value);
        if (toUtc.HasValue)   query = query.Where(t => t.TransactionDate <= toUtc.Value);

        var rows = await query.OrderByDescending(t => t.TransactionDate).ToListAsync(ct);
        return rows.Select(MapImportSummary).ToList();
    }

    public async Task<ImportTransactionDto?> GetImportTransactionByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.ImportTransactions
            .AsNoTracking()
            .Include(t => t.Lines)
                .ThenInclude(l => l.Material)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        return row == null ? null : MapImport(row);
    }

    public async Task<ImportTransactionDto> CreateImportTransactionAsync(
        CreateImportTransactionRequest req, CancellationToken ct = default)
    {
        var entity = new ImportTransaction
        {
            Supplier        = string.IsNullOrWhiteSpace(req.Supplier) ? null : req.Supplier.Trim(),
            TransactionDate = req.TransactionDate.ToUniversalTime(),
            ReceivedDate    = req.ReceivedDate?.ToUniversalTime(),
            Notes           = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            InvoiceRef      = string.IsNullOrWhiteSpace(req.InvoiceRef) ? null : req.InvoiceRef.Trim(),
            CreatedAt       = DateTime.UtcNow,
            Lines           = req.Lines.Select(l => new ImportTransactionLine
            {
                MaterialId = l.MaterialId,
                Quantity   = l.Quantity,
                UnitPrice  = l.UnitPrice,
            }).ToList(),
        };
        _context.ImportTransactions.Add(entity);
        await _context.SaveChangesAsync(ct);

        await _context.Entry(entity).Collection(e => e.Lines).Query()
            .Include(l => l.Material).LoadAsync(ct);

        return MapImport(entity);
    }

    public async Task<ImportTransactionDto?> UpdateImportTransactionAsync(
        int id, UpdateImportTransactionRequest req, CancellationToken ct = default)
    {
        var entity = await _context.ImportTransactions
            .Include(t => t.Lines)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity == null) return null;
        if (entity.IsLocked)
            throw new AccountingBusinessException("This import is locked and cannot be edited.");

        entity.Supplier        = string.IsNullOrWhiteSpace(req.Supplier) ? null : req.Supplier.Trim();
        entity.TransactionDate = req.TransactionDate.ToUniversalTime();
        entity.ReceivedDate    = req.ReceivedDate?.ToUniversalTime();
        entity.Notes           = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        entity.InvoiceRef      = string.IsNullOrWhiteSpace(req.InvoiceRef) ? null : req.InvoiceRef.Trim();

        _context.ImportTransactionLines.RemoveRange(entity.Lines);
        entity.Lines = req.Lines.Select(l => new ImportTransactionLine
        {
            ImportTransactionId = entity.Id,
            MaterialId          = l.MaterialId,
            Quantity            = l.Quantity,
            UnitPrice           = l.UnitPrice,
        }).ToList();

        await _context.SaveChangesAsync(ct);

        await _context.Entry(entity).Collection(e => e.Lines).Query()
            .Include(l => l.Material).LoadAsync(ct);

        return MapImport(entity);
    }

    public async Task<bool> DeleteImportTransactionAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.ImportTransactions
            .Include(t => t.Lines)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity == null) return false;

        _context.ImportTransactions.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ImportTransactionDto?> LockImportTransactionAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.ImportTransactions
            .Include(t => t.Lines)
                .ThenInclude(l => l.Material)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity == null) return null;

        entity.IsLocked = true;
        await _context.SaveChangesAsync(ct);
        return MapImport(entity);
    }

    // ─── Expense categories ────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ExpenseCategoryDto>> GetExpenseCategoryRecordsAsync(CancellationToken ct = default)
    {
        var rows = await _context.ExpenseCategories.AsNoTracking().OrderBy(c => c.Name).ToListAsync(ct);
        return rows.Select(MapExpenseCategory).ToList();
    }

    public async Task<ExpenseCategoryDto> CreateExpenseCategoryAsync(CreateExpenseCategoryRequest req, CancellationToken ct = default)
    {
        var name = req.Name.Trim();
        if (await _context.ExpenseCategories.AnyAsync(c => c.Name == name, ct))
            throw new AccountingBusinessException($"Category '{name}' already exists.");

        var entity = new ExpenseCategory
        {
            Name        = name,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            CreatedAt   = DateTime.UtcNow,
        };
        _context.ExpenseCategories.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapExpenseCategory(entity);
    }

    public async Task<ExpenseCategoryDto?> UpdateExpenseCategoryAsync(int id, UpdateExpenseCategoryRequest req, CancellationToken ct = default)
    {
        var entity = await _context.ExpenseCategories.FindAsync([id], ct);
        if (entity == null) return null;

        var name = req.Name.Trim();
        if (await _context.ExpenseCategories.AnyAsync(c => c.Name == name && c.Id != id, ct))
            throw new AccountingBusinessException($"Category '{name}' already exists.");

        var oldName = entity.Name;
        entity.Name        = name;
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        await _context.SaveChangesAsync(ct);

        if (oldName != name)
        {
            await _context.Expenses
                .Where(e => e.Category == oldName)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.Category, name), ct);
        }

        return MapExpenseCategory(entity);
    }

    public async Task<bool> DeleteExpenseCategoryAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.ExpenseCategories.FindAsync([id], ct);
        if (entity == null) return false;

        var inUse = await _context.Expenses.AnyAsync(e => e.Category == entity.Name, ct);
        if (inUse)
            throw new AccountingBusinessException($"Cannot delete category '{entity.Name}' — expenses still use it.");

        _context.ExpenseCategories.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ExpenseDto>> GetExpensesAsync(
        string? category, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var fromUtc = from?.ToUniversalTime();
        var toUtc   = to?.ToUniversalTime();

        var query = _context.Expenses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(e => e.Category == category);
        if (fromUtc.HasValue) query = query.Where(e => e.ExpenseDate >= fromUtc.Value);
        if (toUtc.HasValue)   query = query.Where(e => e.ExpenseDate <= toUtc.Value);

        var rows = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync(ct);
        return rows.Select(MapExpense).ToList();
    }

    public async Task<ExpenseDto?> GetExpenseByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.Expenses.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);
        return row == null ? null : MapExpense(row);
    }

    public async Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest req, CancellationToken ct = default)
    {
        await EnsureExpenseCategoryExistsAsync(req.Category, ct);

        var entity = new Expense
        {
            Category    = req.Category.Trim(),
            Name        = req.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Amount      = req.Amount,
            ExpenseDate = req.ExpenseDate.ToUniversalTime(),
            Notes       = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt   = DateTime.UtcNow,
        };
        _context.Expenses.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapExpense(entity);
    }

    public async Task<ExpenseDto?> UpdateExpenseAsync(int id, UpdateExpenseRequest req, CancellationToken ct = default)
    {
        var entity = await _context.Expenses.FindAsync([id], ct);
        if (entity == null) return null;

        await EnsureExpenseCategoryExistsAsync(req.Category, ct);

        entity.Category    = req.Category.Trim();
        entity.Name        = req.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        entity.Amount      = req.Amount;
        entity.ExpenseDate = req.ExpenseDate.ToUniversalTime();
        entity.Notes       = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        await _context.SaveChangesAsync(ct);
        return MapExpense(entity);
    }

    public async Task<bool> DeleteExpenseAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.Expenses.FindAsync([id], ct);
        if (entity == null) return false;

        _context.Expenses.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<string>> GetExpenseCategoriesAsync(CancellationToken ct = default)
    {
        return await _context.ExpenseCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => c.Name)
            .ToListAsync(ct);
    }

    // ─── Sold Orders ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ReportOrderLineDto>> GetSoldOrdersAsync(
        DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var fromUtc = from?.ToUniversalTime();
        var toUtc   = to?.ToUniversalTime();

        var query = _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Where(o => o.Status == "Received");

        if (fromUtc.HasValue) query = query.Where(o => o.OrderDate >= fromUtc.Value);
        if (toUtc.HasValue)   query = query.Where(o => o.OrderDate <= toUtc.Value);

        var rows = await query.OrderByDescending(o => o.OrderDate).ToListAsync(ct);
        return rows.Select(o => new ReportOrderLineDto
        {
            OrderId      = o.Id,
            OrderDate    = o.OrderDate,
            Status       = o.Status,
            Total        = o.Total,
            CustomerName = $"{o.Customer.FirstName} {o.Customer.LastName}".Trim(),
        }).ToList();
    }

    // ─── Material Usage ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MaterialUsageRecordDto>> GetUsageRecordsAsync(
        int? materialId, int? orderId, CancellationToken ct = default)
    {
        var query = _context.MaterialUsageRecords
            .AsNoTracking()
            .Include(u => u.Material)
            .AsQueryable();

        if (materialId.HasValue) query = query.Where(u => u.MaterialId == materialId.Value);
        if (orderId.HasValue)    query = query.Where(u => u.OrderId == orderId.Value);

        var rows = await query
            .Include(u => u.ExternalOrder)
            .OrderByDescending(u => u.UsageDate)
            .ToListAsync(ct);
        return rows.Select(MapUsage).ToList();
    }

    public async Task<MaterialUsageRecordDto?> GetUsageRecordByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.MaterialUsageRecords
            .AsNoTracking()
            .Include(u => u.Material)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
        return row == null ? null : MapUsage(row);
    }

    public async Task<MaterialUsageRecordDto> CreateUsageRecordAsync(
        CreateMaterialUsageRequest req, CancellationToken ct = default)
    {
        if (req.OrderId.HasValue && req.ExternalOrderId.HasValue)
            throw new AccountingBusinessException("Link usage to either a website order or an external order, not both.");

        await EnsureUsageQuantityAvailableAsync(req.MaterialId, req.QuantityUsed, excludeUsageId: null, ct);

        var entity = new MaterialUsageRecord
        {
            MaterialId       = req.MaterialId,
            OrderId          = req.OrderId,
            ExternalOrderId  = req.ExternalOrderId,
            QuantityUsed     = req.QuantityUsed,
            UsageDate        = req.UsageDate.ToUniversalTime(),
            Notes            = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt        = DateTime.UtcNow,
        };
        _context.MaterialUsageRecords.Add(entity);
        await _context.SaveChangesAsync(ct);

        await _context.Entry(entity).Reference(e => e.Material).LoadAsync(ct);
        return MapUsage(entity);
    }

    public async Task<MaterialUsageRecordDto?> UpdateUsageRecordAsync(
        int id, UpdateMaterialUsageRequest req, CancellationToken ct = default)
    {
        var entity = await _context.MaterialUsageRecords
            .Include(u => u.Material)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
        if (entity == null) return null;

        if (req.OrderId.HasValue && req.ExternalOrderId.HasValue)
            throw new AccountingBusinessException("Link usage to either a website order or an external order, not both.");

        await EnsureUsageQuantityAvailableAsync(req.MaterialId, req.QuantityUsed, excludeUsageId: id, ct);

        entity.MaterialId      = req.MaterialId;
        entity.OrderId         = req.OrderId;
        entity.ExternalOrderId = req.ExternalOrderId;
        entity.QuantityUsed    = req.QuantityUsed;
        entity.UsageDate    = req.UsageDate.ToUniversalTime();
        entity.Notes        = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        await _context.SaveChangesAsync(ct);

        if (entity.MaterialId != req.MaterialId)
            await _context.Entry(entity).Reference(e => e.Material).LoadAsync(ct);

        return MapUsage(entity);
    }

    public async Task<bool> DeleteUsageRecordAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.MaterialUsageRecords.FindAsync([id], ct);
        if (entity == null) return false;

        _context.MaterialUsageRecords.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ─── External orders & usage picker ───────────────────────────────────────

    public async Task<UsageOrderOptionsDto> GetUsageOrderOptionsAsync(CancellationToken ct = default)
    {
        var from = DateTime.UtcNow.AddMonths(-1);

        var websiteOrders = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Where(o => o.OrderDate >= from)
            .OrderByDescending(o => o.OrderDate)
            .Take(200)
            .ToListAsync(ct);

        var externalOrders = await _context.ExternalOrders
            .AsNoTracking()
            .Where(o => o.OrderDate >= from)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync(ct);

        return new UsageOrderOptionsDto
        {
            WebsiteOrders = websiteOrders.Select(o => new WebsiteOrderOptionDto
            {
                OrderId      = o.Id,
                DisplayId    = FormatWebsiteOrderId(o.Id),
                OrderDate    = o.OrderDate,
                Status       = o.Status,
                CustomerName = $"{o.Customer.FirstName} {o.Customer.LastName}".Trim(),
                Total        = o.Total,
            }).ToList(),
            ExternalOrders = externalOrders.Select(MapExternalOrderOption).ToList(),
        };
    }

    public async Task<ExternalOrderDto> CreateExternalOrderAsync(CreateExternalOrderRequest req, CancellationToken ct = default)
    {
        var entity = new ExternalOrder
        {
            Label         = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim(),
            CustomerName  = string.IsNullOrWhiteSpace(req.CustomerName) ? null : req.CustomerName.Trim(),
            OrderDate     = req.OrderDate.ToUniversalTime(),
            Notes         = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt     = DateTime.UtcNow,
        };
        _context.ExternalOrders.Add(entity);
        await _context.SaveChangesAsync(ct);
        return MapExternalOrder(entity);
    }

    public async Task<IReadOnlyList<ExternalOrderDto>> GetExternalOrdersAsync(CancellationToken ct = default)
    {
        var rows = await _context.ExternalOrders.AsNoTracking().OrderByDescending(o => o.OrderDate).ToListAsync(ct);
        return rows.Select(MapExternalOrder).ToList();
    }

    // ─── Stock Reports ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<StockReportSummaryDto>> GetStockReportsAsync(CancellationToken ct = default)
    {
        var rows = await _context.StockReports
            .AsNoTracking()
            .Include(r => r.Lines)
            .OrderByDescending(r => r.SnapshotDate)
            .ToListAsync(ct);

        return rows.Select(r => new StockReportSummaryDto
        {
            Id              = r.Id,
            SnapshotDate    = r.SnapshotDate,
            Label           = r.Label,
            Notes           = r.Notes,
            CreatedAt       = r.CreatedAt,
            IsLocked        = r.IsLocked,
            LineCount       = r.Lines.Count,
            TotalStockValue = r.Lines.Sum(l => l.TotalValue),
        }).ToList();
    }

    public async Task<StockReportDetailDto?> GetStockReportByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _context.StockReports
            .AsNoTracking()
            .Include(r => r.Lines)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        return row == null ? null : MapStockReportDetail(row);
    }

    public async Task<StockReportDetailDto> CreateStockReportAsync(
        CreateStockReportRequest req, CancellationToken ct = default)
    {
        var now   = DateTime.UtcNow;
        var stock = await GetStockAsync(null, ct);

        var report = new StockReport
        {
            SnapshotDate = now,
            Label        = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim(),
            Notes        = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedAt    = now,
            IsLocked     = true,
            Lines        = stock.Select(s => new StockReportLine
            {
                MaterialId   = s.MaterialId,
                MaterialName = s.Name,
                MaterialUnit = s.Unit,
                QtyImported  = s.QtyImported,
                QtyUsed      = s.QtyUsed,
                QtyOnHand    = s.QtyOnHand,
                AvgUnitCost  = s.AvgUnitCost,
                TotalValue   = s.TotalStockValue,
            }).ToList(),
        };
        _context.StockReports.Add(report);
        await _context.SaveChangesAsync(ct);
        return MapStockReportDetail(report);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    public async Task<AccountingDashboardDto> GetDashboardAsync(
        DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var fromUtc = from?.ToUniversalTime();
        var toUtc   = to?.ToUniversalTime();

        // Sold revenue: orders with status "Received"
        var orderQuery = _context.Orders.AsNoTracking().Where(o => o.Status == "Received");
        if (fromUtc.HasValue) orderQuery = orderQuery.Where(o => o.OrderDate >= fromUtc.Value);
        if (toUtc.HasValue)   orderQuery = orderQuery.Where(o => o.OrderDate <= toUtc.Value);
        var soldRevenue     = await orderQuery.SumAsync(o => (decimal?)o.Total, ct) ?? 0m;
        var totalOrdersSold = await orderQuery.CountAsync(ct);

        // Import spend from import transaction lines
        var importQuery = _context.ImportTransactions.AsNoTracking();
        if (fromUtc.HasValue) importQuery = importQuery.Where(t => t.TransactionDate >= fromUtc.Value);
        if (toUtc.HasValue)   importQuery = importQuery.Where(t => t.TransactionDate <= toUtc.Value);
        var importIds    = importQuery.Select(t => t.Id);
        var importSpend  = await _context.ImportTransactionLines.AsNoTracking()
            .Where(l => importIds.Contains(l.ImportTransactionId))
            .SumAsync(l => (decimal?)(l.Quantity * l.UnitPrice), ct) ?? 0m;

        // Expense spend
        var expenseQuery = _context.Expenses.AsNoTracking();
        if (fromUtc.HasValue) expenseQuery = expenseQuery.Where(e => e.ExpenseDate >= fromUtc.Value);
        if (toUtc.HasValue)   expenseQuery = expenseQuery.Where(e => e.ExpenseDate <= toUtc.Value);
        var expenseSpend = await expenseQuery.SumAsync(e => (decimal?)e.Amount, ct) ?? 0m;

        // Current stock value (not date-filtered)
        var stock            = await GetStockAsync(null, ct);
        var materialStockVal = stock.Sum(s => s.TotalStockValue);

        var totalSpent = importSpend + expenseSpend;

        return new AccountingDashboardDto
        {
            DateFrom           = from,
            DateTo             = to,
            SoldRevenue        = soldRevenue,
            TotalOrdersSold    = totalOrdersSold,
            ImportSpend        = importSpend,
            ExpenseSpend       = expenseSpend,
            TotalSpent         = totalSpent,
            Net                = soldRevenue - totalSpent,
            MaterialStockValue = materialStockVal,
            MaterialCount      = stock.Count,
        };
    }

    // ─── Report ───────────────────────────────────────────────────────────────

    public async Task<AccountingReportDto> GetReportAsync(AccountingReportRequest req, CancellationToken ct = default)
    {
        var fromUtc = req.From?.ToUniversalTime();
        var toUtc   = req.To?.ToUniversalTime();

        var report = new AccountingReportDto
        {
            DateFrom = req.From,
            DateTo   = req.To,
        };

        // Sold orders
        if (req.IncludeOrders)
        {
            var orders = await GetSoldOrdersAsync(req.From, req.To, ct);
            report.Orders      = orders.ToList();
            report.SoldRevenue = orders.Sum(o => o.Total);
        }

        // Import transactions
        if (req.IncludeImports)
        {
            var importQuery = _context.ImportTransactions.AsNoTracking()
                .Include(t => t.Lines).AsQueryable();
            if (fromUtc.HasValue) importQuery = importQuery.Where(t => t.TransactionDate >= fromUtc.Value);
            if (toUtc.HasValue)   importQuery = importQuery.Where(t => t.TransactionDate <= toUtc.Value);
            var imports = await importQuery.OrderByDescending(t => t.TransactionDate).ToListAsync(ct);
            report.ImportTransactions = imports.Select(MapImportSummaryReport).ToList();
            report.ImportSpend = imports.Sum(t => t.Lines.Sum(l => l.Quantity * l.UnitPrice));
        }

        // Expenses by category
        if (req.IncludeExpenses)
        {
            var expenseQuery = _context.Expenses.AsNoTracking().AsQueryable();
            if (fromUtc.HasValue) expenseQuery = expenseQuery.Where(e => e.ExpenseDate >= fromUtc.Value);
            if (toUtc.HasValue)   expenseQuery = expenseQuery.Where(e => e.ExpenseDate <= toUtc.Value);
            var expenses = await expenseQuery.OrderByDescending(e => e.ExpenseDate).ToListAsync(ct);
            report.ExpenseSpend      = expenses.Sum(e => e.Amount);
            report.ExpensesByCategory = expenses
                .GroupBy(e => e.Category)
                .OrderBy(g => g.Key)
                .Select(g => new ReportExpenseCategoryDto
                {
                    Category    = g.Key,
                    TotalAmount = g.Sum(e => e.Amount),
                    Items       = g.Select(e => new ReportExpenseLineDto
                    {
                        Id          = e.Id,
                        Name        = e.Name,
                        Amount      = e.Amount,
                        ExpenseDate = e.ExpenseDate,
                        Description = e.Description,
                    }).ToList(),
                }).ToList();
        }

        // Stock snapshot at report time
        if (req.IncludeStock)
        {
            var stock = await GetStockAsync(null, ct);
            report.StockSnapshot = stock.Select(s => new ReportStockLineDto
            {
                MaterialId   = s.MaterialId,
                MaterialName = s.Name,
                MaterialUnit = s.Unit,
                QtyOnHand    = s.QtyOnHand,
                AvgUnitCost  = s.AvgUnitCost,
                TotalValue   = s.TotalStockValue,
            }).ToList();
        }

        report.TotalSpent = report.ImportSpend + report.ExpenseSpend;
        report.Net        = report.SoldRevenue - report.TotalSpent;

        return report;
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private static MaterialDto MapMaterial(Material m) => new()
    {
        Id          = m.Id,
        Name        = m.Name,
        Description = m.Description,
        Unit        = m.Unit,
        Sku         = m.Sku,
        IsActive    = m.IsActive,
        CreatedAt   = m.CreatedAt,
    };

    private static ImportTransactionSummaryDto MapImportSummary(ImportTransaction t) => new()
    {
        Id              = t.Id,
        Supplier        = t.Supplier,
        TransactionDate = t.TransactionDate,
        ReceivedDate    = t.ReceivedDate,
        InvoiceRef      = t.InvoiceRef,
        IsLocked        = t.IsLocked,
        CreatedAt       = t.CreatedAt,
        TotalAmount     = t.Lines.Sum(l => l.Quantity * l.UnitPrice),
        LineCount       = t.Lines.Count,
    };

    private static ImportTransactionDto MapImport(ImportTransaction t) => new()
    {
        Id              = t.Id,
        Supplier        = t.Supplier,
        TransactionDate = t.TransactionDate,
        ReceivedDate    = t.ReceivedDate,
        Notes           = t.Notes,
        InvoiceRef      = t.InvoiceRef,
        IsLocked        = t.IsLocked,
        CreatedAt       = t.CreatedAt,
        TotalAmount     = t.Lines.Sum(l => l.Quantity * l.UnitPrice),
        Lines = t.Lines.Select(l => new ImportTransactionLineDto
        {
            Id           = l.Id,
            MaterialId   = l.MaterialId,
            MaterialName = l.Material?.Name ?? string.Empty,
            MaterialUnit = l.Material?.Unit ?? string.Empty,
            Quantity     = l.Quantity,
            UnitPrice    = l.UnitPrice,
            LineTotal    = l.Quantity * l.UnitPrice,
        }).ToList(),
    };

    private static ReportImportSummaryDto MapImportSummaryReport(ImportTransaction t) => new()
    {
        Id              = t.Id,
        Supplier        = t.Supplier,
        TransactionDate = t.TransactionDate,
        InvoiceRef      = t.InvoiceRef,
        TotalAmount     = t.Lines.Sum(l => l.Quantity * l.UnitPrice),
        LineCount       = t.Lines.Count,
    };

    private static ExpenseDto MapExpense(Expense e) => new()
    {
        Id          = e.Id,
        Category    = e.Category,
        Name        = e.Name,
        Description = e.Description,
        Amount      = e.Amount,
        ExpenseDate = e.ExpenseDate,
        Notes       = e.Notes,
        CreatedAt   = e.CreatedAt,
    };

    private static MaterialUsageRecordDto MapUsage(MaterialUsageRecord u) => new()
    {
        Id              = u.Id,
        MaterialId      = u.MaterialId,
        MaterialName    = u.Material?.Name ?? string.Empty,
        OrderId         = u.OrderId,
        ExternalOrderId = u.ExternalOrderId,
        OrderDisplay    = BuildOrderDisplay(u),
        QuantityUsed    = u.QuantityUsed,
        UsageDate       = u.UsageDate,
        Notes           = u.Notes,
        CreatedAt       = u.CreatedAt,
    };

    private static string? BuildOrderDisplay(MaterialUsageRecord u)
    {
        if (u.OrderId.HasValue)
            return FormatWebsiteOrderId(u.OrderId.Value);
        if (u.ExternalOrderId.HasValue)
        {
            var baseId = FormatExternalOrderId(u.ExternalOrderId.Value);
            return string.IsNullOrWhiteSpace(u.ExternalOrder?.Label) ? baseId : $"{baseId} — {u.ExternalOrder.Label}";
        }
        return null;
    }

    private static ExpenseCategoryDto MapExpenseCategory(ExpenseCategory c) => new()
    {
        Id          = c.Id,
        Name        = c.Name,
        Description = c.Description,
        CreatedAt   = c.CreatedAt,
    };

    private static ExternalOrderDto MapExternalOrder(ExternalOrder o) => new()
    {
        Id           = o.Id,
        DisplayId    = FormatExternalOrderId(o.Id),
        Label        = o.Label,
        CustomerName = o.CustomerName,
        OrderDate    = o.OrderDate,
        Notes        = o.Notes,
        CreatedAt    = o.CreatedAt,
    };

    private static ExternalOrderOptionDto MapExternalOrderOption(ExternalOrder o) => new()
    {
        Id           = o.Id,
        DisplayId    = FormatExternalOrderId(o.Id),
        Label        = o.Label,
        CustomerName = o.CustomerName,
        OrderDate    = o.OrderDate,
    };

    private static string FormatWebsiteOrderId(int orderId) => $"#KG-{orderId:D5}";

    private static string FormatExternalOrderId(int id) => $"EXT-{id:D4}";

    private async Task EnsureExpenseCategoryExistsAsync(string category, CancellationToken ct)
    {
        var name = category.Trim();
        if (!await _context.ExpenseCategories.AnyAsync(c => c.Name == name, ct))
            throw new AccountingBusinessException($"Unknown expense category '{name}'. Create it in Categories first.");
    }

    private async Task EnsureUsageQuantityAvailableAsync(
        int materialId, decimal quantityUsed, int? excludeUsageId, CancellationToken ct)
    {
        if (quantityUsed <= 0)
            throw new AccountingBusinessException("Quantity used must be greater than zero.");

        var imported = await _context.ImportTransactionLines
            .AsNoTracking()
            .Where(l => l.MaterialId == materialId)
            .SumAsync(l => (decimal?)l.Quantity, ct) ?? 0m;

        var usedQuery = _context.MaterialUsageRecords.AsNoTracking().Where(u => u.MaterialId == materialId);
        if (excludeUsageId.HasValue)
            usedQuery = usedQuery.Where(u => u.Id != excludeUsageId.Value);

        var used = await usedQuery.SumAsync(u => (decimal?)u.QuantityUsed, ct) ?? 0m;
        var available = imported - used;

        if (quantityUsed > available)
            throw new AccountingBusinessException(
                $"Not enough stock. Available: {available:G29}, requested: {quantityUsed:G29}.");
    }

    private static StockReportDetailDto MapStockReportDetail(StockReport r) => new()
    {
        Id              = r.Id,
        SnapshotDate    = r.SnapshotDate,
        Label           = r.Label,
        Notes           = r.Notes,
        CreatedAt       = r.CreatedAt,
        IsLocked        = r.IsLocked,
        TotalStockValue = r.Lines.Sum(l => l.TotalValue),
        Lines = r.Lines.Select(l => new StockReportLineDto
        {
            Id           = l.Id,
            MaterialId   = l.MaterialId,
            MaterialName = l.MaterialName,
            MaterialUnit = l.MaterialUnit,
            QtyImported  = l.QtyImported,
            QtyUsed      = l.QtyUsed,
            QtyOnHand    = l.QtyOnHand,
            AvgUnitCost  = l.AvgUnitCost,
            TotalValue   = l.TotalValue,
        }).ToList(),
    };
}
