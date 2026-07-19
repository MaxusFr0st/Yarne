using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting/production-orders")]
[Authorize(Roles = "Admin")]
public sealed class AccountingProductionController : ControllerBase
{
    private readonly IProductionService _production;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingProductionController(
        IProductionService production,
        IAdminActivityLogService activityLogs)
    {
        _production = production;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductionOrderDto>>> GetProductionOrders(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        return Ok(await _production.GetProductionOrdersAsync(from, to, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductionOrderDto>> GetProductionOrder(
        int id,
        CancellationToken ct)
    {
        var result = await _production.GetProductionOrderAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("finished-goods-stock")]
    public async Task<ActionResult<IReadOnlyList<FinishedGoodsStockProductDto>>> GetFinishedGoodsStock(
        CancellationToken ct)
    {
        return Ok(await _production.GetFinishedGoodsStockAsync(ct));
    }

    [HttpGet("variant-availability/{productId:int}")]
    public async Task<ActionResult<IReadOnlyList<VariantProducedAvailabilityDto>>> GetVariantAvailability(
        int productId,
        CancellationToken ct)
    {
        return Ok(await _production.GetVariantProducedAvailabilityAsync(productId, ct));
    }

    [HttpPost("apply-variant-stock")]
    public async Task<ActionResult<ApplyVariantStockResultDto>> ApplyVariantStock(
        [FromBody] ApplyVariantStockRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _production.ApplyVariantStockAsync(request, actorId, ct);
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Applied {request.Quantity} produced unit(s) to storefront variant " +
                $"(product {request.ProductId}, color {request.ColorId}, size {request.SizeId}" +
                $"{(request.Lace ? ", lace" : "")})",
                entityId: request.ProductId.ToString(),
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The quantity is too large." });
        }
    }

    [HttpPost]
    public async Task<ActionResult<ProductionOrderDto>> CompleteProduction(
        [FromBody] CreateProductionOrderRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _production.CompleteProductionAsync(request, actorId, ct);
            await _activityLogs.LogAsync(
                "accounting",
                "created",
                $"Completed production #{result.Id}: {result.QuantityAddedToStock} × {result.ProductName}",
                entityId: result.Id.ToString(),
                entityLabel: result.ProductName,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return CreatedAtAction(nameof(GetProductionOrder), new { id = result.Id }, result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (OverflowException)
        {
            return BadRequest(new { message = "The production quantity or cost is too large." });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> VoidProductionOrder(int id, CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            if (!await _production.VoidProductionOrderAsync(id, actorId, ct))
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "voided",
                $"Voided production run #{id}",
                entityId: id.ToString(),
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return NoContent();
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
