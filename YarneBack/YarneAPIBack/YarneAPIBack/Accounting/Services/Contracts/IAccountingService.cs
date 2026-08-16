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

    // Expense categories
    Task<IReadOnlyList<ExpenseCategoryDto>> GetExpenseCategoryRecordsAsync(CancellationToken ct = default);
    Task<ExpenseCategoryDto> CreateExpenseCategoryAsync(CreateExpenseCategoryRequest req, CancellationToken ct = default);
    Task<ExpenseCategoryDto?> UpdateExpenseCategoryAsync(int id, UpdateExpenseCategoryRequest req, CancellationToken ct = default);
    Task<bool> DeleteExpenseCategoryAsync(int id, CancellationToken ct = default);

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

    // External orders & usage order picker
    Task<UsageOrderOptionsDto> GetUsageOrderOptionsAsync(CancellationToken ct = default);
    Task<ExternalOrderDto> CreateExternalOrderAsync(CreateExternalOrderRequest req, CancellationToken ct = default);
    Task<IReadOnlyList<ExternalOrderDto>> GetExternalOrdersAsync(CancellationToken ct = default);

    // Stock reports (locked snapshots; soft-voidable)
    Task<IReadOnlyList<StockReportSummaryDto>> GetStockReportsAsync(CancellationToken ct = default);
    Task<StockReportDetailDto?> GetStockReportByIdAsync(int id, CancellationToken ct = default);
    Task<StockReportDetailDto> CreateStockReportAsync(CreateStockReportRequest req, CancellationToken ct = default);
    Task<bool> VoidStockReportAsync(int id, CancellationToken ct = default);

    // Dashboard & report
    Task<AccountingDashboardDto> GetDashboardAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<AccountingReportDto> GetReportAsync(AccountingReportRequest req, CancellationToken ct = default);
}
