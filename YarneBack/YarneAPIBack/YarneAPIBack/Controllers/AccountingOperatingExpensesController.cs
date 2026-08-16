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
public sealed class AccountingOperatingExpensesController : ControllerBase
{
    private readonly IOperatingExpenseService _expenses;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingOperatingExpensesController(
        IOperatingExpenseService expenses,
        IAdminActivityLogService activityLogs)
    {
        _expenses = expenses;
        _activityLogs = activityLogs;
    }

    [HttpGet("operating-expense-categories")]
    public async Task<ActionResult<IReadOnlyList<OperatingExpenseCategoryDto>>> GetCategories(
        CancellationToken ct) =>
        Ok(await _expenses.GetCategoriesAsync(ct));

    [HttpPost("operating-expense-categories")]
    public async Task<ActionResult<OperatingExpenseCategoryDto>> CreateCategory(
        [FromBody] SaveOperatingExpenseCategoryRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _expenses.CreateCategoryAsync(request, actorId, ct);
            await LogAsync("created", $"Created expense category '{result.Name}'", result.Id, actorId, actorEmail, ct);
            return CreatedAtAction(nameof(GetCategories), result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("operating-expense-categories/{id:int}")]
    public async Task<ActionResult<OperatingExpenseCategoryDto>> UpdateCategory(
        int id,
        [FromBody] SaveOperatingExpenseCategoryRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _expenses.UpdateCategoryAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await LogAsync("updated", $"Updated expense category '{result.Name}'", id, actorId, actorEmail, ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("operating-expense-categories/{id:int}")]
    public async Task<IActionResult> VoidCategory(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _expenses.VoidCategoryAsync(id, actorId, ct))
                return NotFound();
            await LogAsync("voided", $"Voided expense category #{id}", id, actorId, actorEmail, ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("operating-expenses")]
    public async Task<ActionResult<IReadOnlyList<OperatingExpenseDto>>> GetExpenses(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? categoryId,
        CancellationToken ct) =>
        Ok(await _expenses.GetExpensesAsync(from, to, categoryId, ct));

    [HttpGet("operating-expenses/{id:int}")]
    public async Task<ActionResult<OperatingExpenseDto>> GetExpense(int id, CancellationToken ct)
    {
        var result = await _expenses.GetExpenseAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("operating-expenses")]
    public async Task<ActionResult<OperatingExpenseDto>> CreateExpense(
        [FromBody] SaveOperatingExpenseRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _expenses.CreateExpenseAsync(request, actorId, ct);
            await LogAsync("created", $"Created {result.CategoryName} expense #{result.Id}", result.Id, actorId, actorEmail, ct);
            return CreatedAtAction(nameof(GetExpense), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The expense amount is too large." });
        }
    }

    [HttpPut("operating-expenses/{id:int}")]
    public async Task<ActionResult<OperatingExpenseDto>> UpdateExpense(
        int id,
        [FromBody] SaveOperatingExpenseRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _expenses.UpdateExpenseAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await LogAsync("updated", $"Updated expense #{id}", id, actorId, actorEmail, ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The expense amount is too large." });
        }
    }

    [HttpDelete("operating-expenses/{id:int}")]
    public async Task<IActionResult> VoidExpense(int id, CancellationToken ct)
    {
        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        if (!await _expenses.VoidExpenseAsync(id, actorId, ct))
            return NotFound();
        await LogAsync("voided", $"Voided expense #{id}", id, actorId, actorEmail, ct);
        return NoContent();
    }

    private Task LogAsync(
        string action,
        string summary,
        int id,
        int? actorId,
        string? actorEmail,
        CancellationToken ct) =>
        _activityLogs.LogAsync(
            "accounting",
            action,
            summary,
            entityId: id.ToString(),
            actorUserId: actorId,
            actorEmail: actorEmail,
            ct: ct);
}
