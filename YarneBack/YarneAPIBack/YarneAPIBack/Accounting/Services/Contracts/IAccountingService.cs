using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IAccountingService
{
    // Categories
    Task<IReadOnlyList<AccountingCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<AccountingCategoryDto?> GetCategoryByIdAsync(int id, CancellationToken ct = default);
    Task<AccountingCategoryDto> CreateCategoryAsync(CreateAccountingCategoryRequest req, CancellationToken ct = default);
    Task<AccountingCategoryDto?> UpdateCategoryAsync(int id, UpdateAccountingCategoryRequest req, CancellationToken ct = default);
    Task<bool> DeleteCategoryAsync(int id, CancellationToken ct = default);

    // Purchases
    Task<IReadOnlyList<AccountingPurchaseDto>> GetPurchasesAsync(int? categoryId = null, CancellationToken ct = default);
    Task<AccountingPurchaseDto?> GetPurchaseByIdAsync(int id, CancellationToken ct = default);
    Task<AccountingPurchaseDto> CreatePurchaseAsync(CreateAccountingPurchaseRequest req, CancellationToken ct = default);
    Task<AccountingPurchaseDto?> UpdatePurchaseAsync(int id, UpdateAccountingPurchaseRequest req, CancellationToken ct = default);
    Task<bool> DeletePurchaseAsync(int id, CancellationToken ct = default);

    // Marketing
    Task<IReadOnlyList<MarketingExpenditureDto>> GetMarketingAsync(CancellationToken ct = default);
    Task<MarketingExpenditureDto?> GetMarketingByIdAsync(int id, CancellationToken ct = default);
    Task<MarketingExpenditureDto> CreateMarketingAsync(CreateMarketingExpenditureRequest req, CancellationToken ct = default);
    Task<MarketingExpenditureDto?> UpdateMarketingAsync(int id, UpdateMarketingExpenditureRequest req, CancellationToken ct = default);
    Task<bool> DeleteMarketingAsync(int id, CancellationToken ct = default);

    // Stats & reports
    Task<AccountingDashboardDto> GetDashboardAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<AccountingReportDto> GetReportAsync(AccountingReportRequest req, CancellationToken ct = default);
}
