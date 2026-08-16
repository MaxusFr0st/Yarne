using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting;
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

    // ─── Materials ───────────────────────────────────────────────────────────

    [HttpGet("materials")]
    [ProducesResponseType(typeof(IReadOnlyList<MaterialDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MaterialDto>>> GetMaterials(
        [FromQuery] bool? isActive = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetMaterialsAsync(isActive, ct);
        return Ok(result);
    }

    [HttpGet("materials/{id:int}")]
    [ProducesResponseType(typeof(MaterialDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaterialDto>> GetMaterial(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetMaterialByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("materials")]
    [ProducesResponseType(typeof(MaterialDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MaterialDto>> CreateMaterial(
        [FromBody] CreateMaterialRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var result = await _accounting.CreateMaterialAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created", $"Created material '{result.Name}'",
            entityId: result.Id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetMaterial), new { id = result.Id }, result);
    }

    [HttpPut("materials/{id:int}")]
    [ProducesResponseType(typeof(MaterialDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaterialDto>> UpdateMaterial(
        int id, [FromBody] UpdateMaterialRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });

        var result = await _accounting.UpdateMaterialAsync(id, req, ct);
        if (result == null) return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "updated", $"Updated material '{result.Name}'",
            entityId: id.ToString(), entityLabel: result.Name,
            actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return Ok(result);
    }

    [HttpDelete("materials/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMaterial(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeleteMaterialAsync(id, ct);
        if (!deleted) return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted material #{id}",
            entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    [HttpGet("materials/stock")]
    [ProducesResponseType(typeof(IReadOnlyList<MaterialStockDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MaterialStockDto>>> GetStock(
        [FromQuery] int? materialId = null, CancellationToken ct = default)
    {
        var result = await _accounting.GetStockAsync(materialId, ct);
        return Ok(result);
    }

    // ─── Import Transactions ─────────────────────────────────────────────────

    [HttpGet("imports")]
    [ProducesResponseType(typeof(IReadOnlyList<ImportTransactionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ImportTransactionSummaryDto>>> GetImports(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to   = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetImportTransactionsAsync(from, to, ct);
        return Ok(result);
    }

    [HttpGet("imports/{id:int}")]
    [ProducesResponseType(typeof(ImportTransactionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportTransactionDto>> GetImport(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetImportTransactionByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("imports")]
    [ProducesResponseType(typeof(ImportTransactionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImportTransactionDto>> CreateImport(
        [FromBody] CreateImportTransactionRequest req, CancellationToken ct = default)
    {
        if (req.Lines.Count == 0)
            return BadRequest(new { message = "At least one line is required." });
        if (req.Lines.Any(l => l.Quantity <= 0))
            return BadRequest(new { message = "Line quantity must be positive." });
        if (req.Lines.Any(l => l.UnitPrice < 0))
            return BadRequest(new { message = "Line unit price cannot be negative." });

        var result = await _accounting.CreateImportTransactionAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created",
            $"Created import transaction #{result.Id} ({result.Supplier ?? "no supplier"})",
            entityId: result.Id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetImport), new { id = result.Id }, result);
    }

    [HttpPut("imports/{id:int}")]
    [ProducesResponseType(typeof(ImportTransactionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportTransactionDto>> UpdateImport(
        int id, [FromBody] UpdateImportTransactionRequest req, CancellationToken ct = default)
    {
        if (req.Lines.Count == 0)
            return BadRequest(new { message = "At least one line is required." });
        if (req.Lines.Any(l => l.Quantity <= 0))
            return BadRequest(new { message = "Line quantity must be positive." });
        if (req.Lines.Any(l => l.UnitPrice < 0))
            return BadRequest(new { message = "Line unit price cannot be negative." });

        try
        {
            var result = await _accounting.UpdateImportTransactionAsync(id, req, ct);
            if (result == null) return NotFound();

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "updated",
                $"Updated import transaction #{id}",
                entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("imports/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteImport(int id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _accounting.DeleteImportTransactionAsync(id, ct);
            if (!deleted) return NotFound();

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "deleted", $"Deleted import transaction #{id}",
                entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Expense categories ───────────────────────────────────────────────────

    [HttpGet("expense-categories")]
    [ProducesResponseType(typeof(IReadOnlyList<ExpenseCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExpenseCategoryDto>>> GetExpenseCategoryRecords(CancellationToken ct = default)
    {
        var result = await _accounting.GetExpenseCategoryRecordsAsync(ct);
        return Ok(result);
    }

    [HttpPost("expense-categories")]
    [ProducesResponseType(typeof(ExpenseCategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExpenseCategoryDto>> CreateExpenseCategory(
        [FromBody] CreateExpenseCategoryRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        try
        {
            var result = await _accounting.CreateExpenseCategoryAsync(req, ct);
            return CreatedAtAction(nameof(GetExpenseCategoryRecords), result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("expense-categories/{id:int}")]
    [ProducesResponseType(typeof(ExpenseCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExpenseCategoryDto>> UpdateExpenseCategory(
        int id, [FromBody] UpdateExpenseCategoryRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        try
        {
            var result = await _accounting.UpdateExpenseCategoryAsync(id, req, ct);
            return result == null ? NotFound() : Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("expense-categories/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteExpenseCategory(int id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _accounting.DeleteExpenseCategoryAsync(id, ct);
            return deleted ? NoContent() : NotFound();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Expenses ─────────────────────────────────────────────────────────────

    [HttpGet("expenses")]
    [ProducesResponseType(typeof(IReadOnlyList<ExpenseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExpenseDto>>> GetExpenses(
        [FromQuery] string? category = null,
        [FromQuery] DateTime? from   = null,
        [FromQuery] DateTime? to     = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetExpensesAsync(category, from, to, ct);
        return Ok(result);
    }

    [HttpGet("expenses/categories")]
    [ProducesResponseType(typeof(IReadOnlyList<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<string>>> GetExpenseCategories(CancellationToken ct = default)
    {
        var result = await _accounting.GetExpenseCategoriesAsync(ct);
        return Ok(result);
    }

    [HttpGet("expenses/{id:int}")]
    [ProducesResponseType(typeof(ExpenseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExpenseDto>> GetExpense(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetExpenseByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("expenses")]
    [ProducesResponseType(typeof(ExpenseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExpenseDto>> CreateExpense(
        [FromBody] CreateExpenseRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Category))
            return BadRequest(new { message = "Category is required." });
        if (req.Amount < 0)
            return BadRequest(new { message = "Amount cannot be negative." });

        try
        {
            var result = await _accounting.CreateExpenseAsync(req, ct);

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "created",
                $"Created expense '{result.Name}' [{result.Category}] ({result.Amount:N2})",
                entityId: result.Id.ToString(), entityLabel: result.Name,
                actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return CreatedAtAction(nameof(GetExpense), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("expenses/{id:int}")]
    [ProducesResponseType(typeof(ExpenseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExpenseDto>> UpdateExpense(
        int id, [FromBody] UpdateExpenseRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Category))
            return BadRequest(new { message = "Category is required." });
        if (req.Amount < 0)
            return BadRequest(new { message = "Amount cannot be negative." });

        try
        {
            var result = await _accounting.UpdateExpenseAsync(id, req, ct);
            if (result == null) return NotFound();

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "updated", $"Updated expense '{result.Name}'",
                entityId: id.ToString(), entityLabel: result.Name,
                actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("expenses/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteExpense(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeleteExpenseAsync(id, ct);
        if (!deleted) return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted expense #{id}",
            entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Sold Orders ──────────────────────────────────────────────────────────

    [HttpGet("sold")]
    [ProducesResponseType(typeof(IReadOnlyList<ReportOrderLineDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ReportOrderLineDto>>> GetSold(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to   = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetSoldOrdersAsync(from, to, ct);
        return Ok(result);
    }

    // ─── Material Usage ───────────────────────────────────────────────────────

    [HttpGet("usage/order-options")]
    [ProducesResponseType(typeof(UsageOrderOptionsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UsageOrderOptionsDto>> GetUsageOrderOptions(CancellationToken ct = default)
    {
        var result = await _accounting.GetUsageOrderOptionsAsync(ct);
        return Ok(result);
    }

    [HttpPost("external-orders")]
    [ProducesResponseType(typeof(ExternalOrderDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<ExternalOrderDto>> CreateExternalOrder(
        [FromBody] CreateExternalOrderRequest req, CancellationToken ct = default)
    {
        var result = await _accounting.CreateExternalOrderAsync(req, ct);
        return CreatedAtAction(nameof(GetUsageOrderOptions), result);
    }

    [HttpGet("usage")]
    [ProducesResponseType(typeof(IReadOnlyList<MaterialUsageRecordDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MaterialUsageRecordDto>>> GetUsage(
        [FromQuery] int? materialId = null,
        [FromQuery] int? orderId    = null,
        CancellationToken ct = default)
    {
        var result = await _accounting.GetUsageRecordsAsync(materialId, orderId, ct);
        return Ok(result);
    }

    [HttpGet("usage/{id:int}")]
    [ProducesResponseType(typeof(MaterialUsageRecordDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaterialUsageRecordDto>> GetUsageRecord(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetUsageRecordByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("usage")]
    [ProducesResponseType(typeof(MaterialUsageRecordDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MaterialUsageRecordDto>> CreateUsage(
        [FromBody] CreateMaterialUsageRequest req, CancellationToken ct = default)
    {
        if (req.QuantityUsed <= 0)
            return BadRequest(new { message = "QuantityUsed must be positive." });

        try
        {
            var result = await _accounting.CreateUsageRecordAsync(req, ct);

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "created",
                $"Recorded usage of {result.QuantityUsed} {result.MaterialName}",
                entityId: result.Id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return CreatedAtAction(nameof(GetUsageRecord), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("usage/{id:int}")]
    [ProducesResponseType(typeof(MaterialUsageRecordDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaterialUsageRecordDto>> UpdateUsage(
        int id, [FromBody] UpdateMaterialUsageRequest req, CancellationToken ct = default)
    {
        if (req.QuantityUsed <= 0)
            return BadRequest(new { message = "QuantityUsed must be positive." });

        try
        {
            var result = await _accounting.UpdateUsageRecordAsync(id, req, ct);
            if (result == null) return NotFound();

            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync("accounting", "updated", $"Updated usage record #{id}",
                entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("usage/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUsage(int id, CancellationToken ct = default)
    {
        var deleted = await _accounting.DeleteUsageRecordAsync(id, ct);
        if (!deleted) return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "deleted", $"Deleted usage record #{id}",
            entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Stock Reports ────────────────────────────────────────────────────────

    [HttpGet("stock-reports")]
    [ProducesResponseType(typeof(IReadOnlyList<StockReportSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StockReportSummaryDto>>> GetStockReports(
        CancellationToken ct = default)
    {
        var result = await _accounting.GetStockReportsAsync(ct);
        return Ok(result);
    }

    [HttpGet("stock-reports/{id:int}")]
    [ProducesResponseType(typeof(StockReportDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockReportDetailDto>> GetStockReport(int id, CancellationToken ct = default)
    {
        var result = await _accounting.GetStockReportByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("stock-reports")]
    [ProducesResponseType(typeof(StockReportDetailDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<StockReportDetailDto>> CreateStockReport(
        [FromBody] CreateStockReportRequest req, CancellationToken ct = default)
    {
        var result = await _accounting.CreateStockReportAsync(req, ct);

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "created",
            $"Created stock report snapshot '{result.Label ?? result.SnapshotDate.ToString("yyyy-MM-dd")}'",
            entityId: result.Id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return CreatedAtAction(nameof(GetStockReport), new { id = result.Id }, result);
    }

    [HttpDelete("stock-reports/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VoidStockReport(int id, CancellationToken ct = default)
    {
        var voided = await _accounting.VoidStockReportAsync(id, ct);
        if (!voided) return NotFound();

        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync("accounting", "voided", $"Voided stock report #{id}",
            entityId: id.ToString(), actorUserId: actorId, actorEmail: actorEmail, ct: ct);

        return NoContent();
    }

    // ─── Dashboard & Reports ──────────────────────────────────────────────────

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
        [FromQuery] DateTime? from        = null,
        [FromQuery] DateTime? to          = null,
        [FromQuery] bool includeOrders    = true,
        [FromQuery] bool includeImports   = true,
        [FromQuery] bool includeExpenses  = true,
        [FromQuery] bool includeStock     = true,
        CancellationToken ct = default)
    {
        var req = new AccountingReportRequest
        {
            From            = from,
            To              = to,
            IncludeOrders   = includeOrders,
            IncludeImports  = includeImports,
            IncludeExpenses = includeExpenses,
            IncludeStock    = includeStock,
        };

        var result = await _accounting.GetReportAsync(req, ct);
        return Ok(result);
    }

    [HttpGet("report/pdf")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReportPdf(
        [FromQuery] DateTime? from        = null,
        [FromQuery] DateTime? to          = null,
        [FromQuery] bool includeOrders    = true,
        [FromQuery] bool includeImports   = true,
        [FromQuery] bool includeExpenses  = true,
        [FromQuery] bool includeStock     = true,
        CancellationToken ct = default)
    {
        var req = new AccountingReportRequest
        {
            From            = from,
            To              = to,
            IncludeOrders   = includeOrders,
            IncludeImports  = includeImports,
            IncludeExpenses = includeExpenses,
            IncludeStock    = includeStock,
        };

        var report   = await _accounting.GetReportAsync(req, ct);
        var pdfBytes = _pdf.GenerateReport(report);

        var fromLabel = from.HasValue ? from.Value.ToString("yyyy-MM-dd") : "start";
        var toLabel   = to.HasValue   ? to.Value.ToString("yyyy-MM-dd")   : "today";
        var fileName  = $"yarne-accounting-report-{fromLabel}-{toLabel}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }
}
