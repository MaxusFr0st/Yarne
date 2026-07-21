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
public sealed class AccountingSalesController : ControllerBase
{
    private readonly ISalesAccountingService _sales;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingSalesController(
        ISalesAccountingService sales,
        IAdminActivityLogService activityLogs)
    {
        _sales = sales;
        _activityLogs = activityLogs;
    }

    [HttpGet("customers")]
    public async Task<ActionResult<IReadOnlyList<AccountingCustomerDto>>> GetCustomers(
        CancellationToken ct) =>
        Ok(await _sales.GetCustomersAsync(ct));

    [HttpPost("customers")]
    public async Task<ActionResult<AccountingCustomerDto>> CreateCustomer(
        [FromBody] SaveAccountingCustomerRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _sales.CreateCustomerAsync(request, actorId, ct);
            await LogAsync("created", $"Created customer '{result.Name}'", result.Id, result.Name, actorId, actorEmail, ct);
            return CreatedAtAction(nameof(GetCustomers), result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("customers/{id:int}")]
    public async Task<ActionResult<AccountingCustomerDto>> UpdateCustomer(
        int id,
        [FromBody] SaveAccountingCustomerRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _sales.UpdateCustomerAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await LogAsync("updated", $"Updated customer '{result.Name}'", id, result.Name, actorId, actorEmail, ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("customers/{id:int}")]
    public async Task<IActionResult> VoidCustomer(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _sales.VoidCustomerAsync(id, actorId, ct))
                return NotFound();
            await LogAsync("voided", $"Voided customer #{id}", id, null, actorId, actorEmail, ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("sales-channels")]
    public async Task<ActionResult<IReadOnlyList<SalesChannelDto>>> GetChannels(CancellationToken ct) =>
        Ok(await _sales.GetChannelsAsync(ct));

    [HttpPost("sales-channels")]
    public async Task<ActionResult<SalesChannelDto>> CreateChannel(
        [FromBody] SaveSalesChannelRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _sales.CreateChannelAsync(request, actorId, ct);
            await LogAsync("created", $"Created sales channel '{result.Name}'", result.Id, result.Name, actorId, actorEmail, ct);
            return CreatedAtAction(nameof(GetChannels), result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("sales-channels/{id:int}")]
    public async Task<ActionResult<SalesChannelDto>> UpdateChannel(
        int id,
        [FromBody] SaveSalesChannelRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _sales.UpdateChannelAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await LogAsync("updated", $"Updated sales channel '{result.Name}'", id, result.Name, actorId, actorEmail, ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("sales-channels/{id:int}")]
    public async Task<IActionResult> VoidChannel(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _sales.VoidChannelAsync(id, actorId, ct))
                return NotFound();
            await LogAsync("voided", $"Voided sales channel #{id}", id, null, actorId, actorEmail, ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("sales-orders")]
    public async Task<ActionResult<IReadOnlyList<AccountingSalesOrderDto>>> GetSalesOrders(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct) =>
        Ok(await _sales.GetSalesOrdersAsync(from, to, ct));

    [HttpGet("sales-orders/{id:int}")]
    public async Task<ActionResult<AccountingSalesOrderDto>> GetSalesOrder(int id, CancellationToken ct)
    {
        var result = await _sales.GetSalesOrderAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("sales-orders")]
    public async Task<ActionResult<AccountingSalesOrderDto>> CreateSalesOrder(
        [FromBody] CreateAccountingSalesOrderRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _sales.CreateSalesOrderAsync(request, actorId, ct);
            await LogAsync(
                "created",
                $"Created {result.ChannelName} sale #{result.Id}",
                result.Id,
                result.CustomerName,
                actorId,
                actorEmail,
                ct);
            return CreatedAtAction(nameof(GetSalesOrder), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The sales order quantity or amount is too large." });
        }
    }

    [HttpDelete("sales-orders/{id:int}")]
    public async Task<IActionResult> VoidSalesOrder(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _sales.VoidSalesOrderAsync(id, actorId, ct))
                return NotFound();
            await LogAsync("voided", $"Voided sale #{id}", id, null, actorId, actorEmail, ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Self-heal: resets Product.QuantityInStock and FinishedGoodsInventory.QuantityOnHand from
    /// Σ FinishedGoodsLot.QuantityRemaining (non-void lots). Use if pooled counters ever drift
    /// from the lot-authoritative ledger.
    /// </summary>
    [HttpPost("reconcile-finished-goods")]
    public async Task<ActionResult<object>> ReconcileFinishedGoods(CancellationToken ct)
    {
        var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        var adjusted = await _sales.ReconcileFinishedGoodsAsync(actorId, ct);
        await LogAsync(
            "reconciled",
            $"Reconciled finished-goods stock counters ({adjusted} row(s) adjusted)",
            0,
            null,
            actorId,
            actorEmail,
            ct);
        return Ok(new { adjustedCount = adjusted });
    }

    private Task LogAsync(
        string action,
        string summary,
        int entityId,
        string? entityLabel,
        int? actorId,
        string? actorEmail,
        CancellationToken ct) =>
        _activityLogs.LogAsync(
            "accounting",
            action,
            summary,
            entityId: entityId.ToString(),
            entityLabel: entityLabel,
            actorUserId: actorId,
            actorEmail: actorEmail,
            ct: ct);
}
