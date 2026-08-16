using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IAccountingPdfService
{
    byte[] GenerateReport(AccountingReportDto report);
}
