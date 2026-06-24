using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting")]
[Authorize(Roles = "Admin")]
public class AccountingController : ControllerBase
{
    private readonly IAccountingService _accounting;
    private readonly IAccountingPdfService _pdf;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingController(
        IAccountingService accounting,
        IAccountingPdfService pdf,
        IAdminActivityLogService activityLogs)
    {
        _accounting   = accounting;
        _pdf          = pdf;
        _activityLogs = activityLogs;
    }

    // ─── Categories ─────────────────────────────────────────────────────────

    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountingCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AccountingCategoryDto>>> GetCategories(CancellationToken ct = default)
    {
        var result = await _accounting.GetCategoriesAsync(ct);
        return Ok(result);
    }

    [HttpGet("categories/{id:int}")]
    [ProducesResponseType(typeof(AccountingCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountingCategoryDto>> GetCategory(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetCategoryByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("categories")]
    [ProducesResponseType(typeof(AccountingCategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AccountingCategoryDto>> CreateCategory(
        [FromBody] CreateAccountingCategoryRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var result = await _accounting.CreateCategoryAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created", $"Created accounting category '{result.Name}'",
            entityId: result.Id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetCategory), new { id = result.Id }, result);
    }

    [HttpPut("categories/{id:int}")]
    [ProducesResponseType(typeof(AccountingCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountingCategoryDto>> UpdateCategory(
        int id,
        [FromBody] UpdateAccountingCategoryRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var result = await _accounting.UpdateCategoryAsync(id, req, ct);
        if (result == null)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "updated", $"Updated accounting category '{result.Name}'",
            entityId: id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return Ok(result);
    }

    [HttpDelete("categories/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeleteCategoryAsync(id, ct);
        if (!deleted)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted accounting category #{id}",
            entityId: id.ToString(),
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Purchases ───────────────────────────────────────────────────────────

    [HttpGet("purchases")]
    [ProducesResponseType(typeof(IReadOnlyList<AccountingPurchaseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AccountingPurchaseDto>>> GetPurchases(
        [FromQuery] int? categoryId = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetPurchasesAsync(categoryId, ct);
        return Ok(result);
    }

    [HttpGet("purchases/{id:int}")]
    [ProducesResponseType(typeof(AccountingPurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountingPurchaseDto>> GetPurchase(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetPurchaseByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("purchases")]
    [ProducesResponseType(typeof(AccountingPurchaseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AccountingPurchaseDto>> CreatePurchase(
        [FromBody] CreateAccountingPurchaseRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (req.Quantity < 0 || req.QuantitySold < 0)
            return BadRequest(new { message = "Quantity values cannot be negative." });
        if (req.UnitCost < 0)
            return BadRequest(new { message = "UnitCost cannot be negative." });

        var result = await _accounting.CreatePurchaseAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created", $"Created purchase '{result.Name}'",
            entityId: result.Id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetPurchase), new { id = result.Id }, result);
    }

    [HttpPut("purchases/{id:int}")]
    [ProducesResponseType(typeof(AccountingPurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountingPurchaseDto>> UpdatePurchase(
        int id,
        [FromBody] UpdateAccountingPurchaseRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (req.Quantity < 0 || req.QuantitySold < 0)
            return BadRequest(new { message = "Quantity values cannot be negative." });
        if (req.UnitCost < 0)
            return BadRequest(new { message = "UnitCost cannot be negative." });

        var result = await _accounting.UpdatePurchaseAsync(id, req, ct);
        if (result == null)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "updated", $"Updated purchase '{result.Name}'",
            entityId: id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return Ok(result);
    }

    [HttpDelete("purchases/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePurchase(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeletePurchaseAsync(id, ct);
        if (!deleted)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted purchase #{id}",
            entityId: id.ToString(),
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Marketing ───────────────────────────────────────────────────────────

    [HttpGet("marketing")]
    [ProducesResponseType(typeof(IReadOnlyList<MarketingExpenditureDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MarketingExpenditureDto>>> GetMarketing(CancellationToken ct = default)
    {
        var result = await _accounting.GetMarketingAsync(ct);
        return Ok(result);
    }

    [HttpGet("marketing/{id:int}")]
    [ProducesResponseType(typeof(MarketingExpenditureDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MarketingExpenditureDto>> GetMarketingItem(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetMarketingByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("marketing")]
    [ProducesResponseType(typeof(MarketingExpenditureDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MarketingExpenditureDto>> CreateMarketing(
        [FromBody] CreateMarketingExpenditureRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (req.Amount < 0)
            return BadRequest(new { message = "Amount cannot be negative." });

        var result = await _accounting.CreateMarketingAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created", $"Created marketing expenditure '{result.Name}' ({result.Amount:N2})",
            entityId: result.Id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetMarketingItem), new { id = result.Id }, result);
    }

    [HttpPut("marketing/{id:int}")]
    [ProducesResponseType(typeof(MarketingExpenditureDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MarketingExpenditureDto>> UpdateMarketing(
        int id,
        [FromBody] UpdateMarketingExpenditureRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (req.Amount < 0)
            return BadRequest(new { message = "Amount cannot be negative." });

        var result = await _accounting.UpdateMarketingAsync(id, req, ct);
        if (result == null)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "updated", $"Updated marketing expenditure '{result.Name}'",
            entityId: id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return Ok(result);
    }

    [HttpDelete("marketing/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMarketing(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeleteMarketingAsync(id, ct);
        if (!deleted)
            return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted marketing expenditure #{id}",
            entityId: id.ToString(),
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Dashboard & Reports ─────────────────────────────────────────────────

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AccountingDashboardDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountingDashboardDto>> GetDashboard(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to   = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetDashboardAsync(from, to, ct);
        return Ok(result);
    }

    [HttpGet("report")]
    [ProducesResponseType(typeof(AccountingReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountingReportDto>> GetReport(
        [FromQuery] DateTime? from               = null,
        [FromQuery] DateTime? to                 = null,
        [FromQuery] List<int>? categoryIds       = null,
        [FromQuery] bool includeOrders           = true,
        [FromQuery] bool includePurchases        = true,
        [FromQuery] bool includeMarketing        = true,
        CancellationToken ct = default)
    {
        var req = new AccountingReportRequest
        {
            From             = from,
            To               = to,
            CategoryIds      = categoryIds,
            IncludeOrders    = includeOrders,
            IncludePurchases = includePurchases,
            IncludeMarketing = includeMarketing,
        };

        var result = await _accounting.GetReportAsync(req, ct);
        return Ok(result);
    }

    [HttpGet("report/pdf")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReportPdf(
        [FromQuery] DateTime? from               = null,
        [FromQuery] DateTime? to                 = null,
        [FromQuery] List<int>? categoryIds       = null,
        [FromQuery] bool includeOrders           = true,
        [FromQuery] bool includePurchases        = true,
        [FromQuery] bool includeMarketing        = true,
        CancellationToken ct = default)
    {
        var req = new AccountingReportRequest
        {
            From             = from,
            To               = to,
            CategoryIds      = categoryIds,
            IncludeOrders    = includeOrders,
            IncludePurchases = includePurchases,
            IncludeMarketing = includeMarketing,
        };

        var report   = await _accounting.GetReportAsync(req, ct);
        var pdfBytes = _pdf.GenerateReport(report);

        var fromLabel = from.HasValue ? from.Value.ToString("yyyy-MM-dd") : "start";
        var toLabel   = to.HasValue   ? to.Value.ToString("yyyy-MM-dd")   : "today";
        var fileName  = $"yarne-accounting-report-{fromLabel}-{toLabel}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }
}
