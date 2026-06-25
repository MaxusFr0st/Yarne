using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IAccountingService
{
    // Materials
    Task<IReadOnlyList<MaterialDto>> GetMaterialsAsync(bool? isActive = null, CancellationToken ct = default);
    Task<MaterialDto?> GetMaterialByIdAsync(int id, CancellationToken ct = default);
    Task<MaterialDto> CreateMaterialAsync(CreateMaterialRequest req, CancellationToken ct = default);
    Task<MaterialDto?> UpdateMaterialAsync(int id, UpdateMaterialRequest req, CancellationToken ct = default);
    Task<bool> DeleteMaterialAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<MaterialStockDto>> GetStockAsync(int? materialId = null, CancellationToken ct = default);

    // Import transactions
    Task<IReadOnlyList<ImportTransactionSummaryDto>> GetImportTransactionsAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<ImportTransactionDto?> GetImportTransactionByIdAsync(int id, CancellationToken ct = default);
    Task<ImportTransactionDto> CreateImportTransactionAsync(CreateImportTransactionRequest req, CancellationToken ct = default);
    Task<ImportTransactionDto?> UpdateImportTransactionAsync(int id, UpdateImportTransactionRequest req, CancellationToken ct = default);
    Task<bool> DeleteImportTransactionAsync(int id, CancellationToken ct = default);

    // Expenses
    Task<IReadOnlyList<ExpenseDto>> GetExpensesAsync(string? category, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<ExpenseDto?> GetExpenseByIdAsync(int id, CancellationToken ct = default);
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseRequest req, CancellationToken ct = default);
    Task<ExpenseDto?> UpdateExpenseAsync(int id, UpdateExpenseRequest req, CancellationToken ct = default);
    Task<bool> DeleteExpenseAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetExpenseCategoriesAsync(CancellationToken ct = default);

    // Sold orders
    Task<IReadOnlyList<ReportOrderLineDto>> GetSoldOrdersAsync(DateTime? from, DateTime? to, CancellationToken ct = default);

    // Material usage
    Task<IReadOnlyList<MaterialUsageRecordDto>> GetUsageRecordsAsync(int? materialId, int? orderId, CancellationToken ct = default);
    Task<MaterialUsageRecordDto?> GetUsageRecordByIdAsync(int id, CancellationToken ct = default);
    Task<MaterialUsageRecordDto> CreateUsageRecordAsync(CreateMaterialUsageRequest req, CancellationToken ct = default);
    Task<MaterialUsageRecordDto?> UpdateUsageRecordAsync(int id, UpdateMaterialUsageRequest req, CancellationToken ct = default);
    Task<bool> DeleteUsageRecordAsync(int id, CancellationToken ct = default);

    // Stock reports (immutable snapshots)
    Task<IReadOnlyList<StockReportSummaryDto>> GetStockReportsAsync(CancellationToken ct = default);
    Task<StockReportDetailDto?> GetStockReportByIdAsync(int id, CancellationToken ct = default);
    Task<StockReportDetailDto> CreateStockReportAsync(CreateStockReportRequest req, CancellationToken ct = default);

    // Dashboard & report
    Task<AccountingDashboardDto> GetDashboardAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<AccountingReportDto> GetReportAsync(AccountingReportRequest req, CancellationToken ct = default);
}
