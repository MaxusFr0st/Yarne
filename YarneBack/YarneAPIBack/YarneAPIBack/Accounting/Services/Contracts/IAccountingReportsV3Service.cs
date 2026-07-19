using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IAccountingReportsV3Service
{
    Task<AccountingDashboardV3Dto> GetDashboardAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
}
