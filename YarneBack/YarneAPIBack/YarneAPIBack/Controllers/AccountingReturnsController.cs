using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting/returns")]
[Authorize(Roles = "Admin")]
public sealed class AccountingReturnsController : ControllerBase
{
    private readonly IReturnService _returns;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingReturnsController(
        IReturnService returns,
        IAdminActivityLogService activityLogs)
    {
        _returns = returns;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ReturnOrderDto>>> GetReturns(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct) =>
        Ok(await _returns.GetReturnsAsync(from, to, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReturnOrderDto>> GetReturn(int id, CancellationToken ct)
    {
        var result = await _returns.GetReturnAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ReturnOrderDto>> CreateReturn(
        [FromBody] CreateReturnOrderRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _returns.CreateReturnAsync(request, actorId, ct);
            await LogAsync(
                "created",
                $"Created return #{result.Id} for sale #{result.SalesOrderId}",
                result.Id,
                actorId,
                actorEmail,
                ct);
            return CreatedAtAction(nameof(GetReturn), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The return quantity or amount is too large." });
        }
    }

    [HttpPost("{id:int}/complete")]
    public async Task<ActionResult<ReturnOrderDto>> CompleteReturn(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _returns.CompleteReturnAsync(id, actorId, ct);
            if (result is null)
                return NotFound();
            await LogAsync(
                "completed",
                $"Completed return #{id} ({result.Resolution})",
                id,
                actorId,
                actorEmail,
                ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> VoidDraftReturn(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _returns.VoidDraftReturnAsync(id, actorId, ct))
                return NotFound();
            await LogAsync("voided", $"Voided draft return #{id}", id, actorId, actorEmail, ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
