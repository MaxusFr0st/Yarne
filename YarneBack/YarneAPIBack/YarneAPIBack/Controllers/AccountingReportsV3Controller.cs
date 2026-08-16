using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting/v3/reports")]
[Authorize(Roles = "Admin")]
public sealed class AccountingReportsV3Controller : ControllerBase
{
    private readonly IAccountingReportsV3Service _reports;

    public AccountingReportsV3Controller(IAccountingReportsV3Service reports)
    {
        _reports = reports;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<AccountingDashboardV3Dto>> GetDashboard(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        if (from.HasValue && to.HasValue && from.Value > to.Value)
            return BadRequest(new { message = "The start date must be before the end date." });
        return Ok(await _reports.GetDashboardAsync(from, to, ct));
    }
}
