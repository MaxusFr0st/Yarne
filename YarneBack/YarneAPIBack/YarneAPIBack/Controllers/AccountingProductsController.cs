using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Accounting;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/accounting/products")]
[Authorize(Roles = "Admin")]
public sealed class AccountingProductsController : ControllerBase
{
    private readonly IProductAccountingService _products;
    private readonly IAdminActivityLogService _activityLogs;

    public AccountingProductsController(
        IProductAccountingService products,
        IAdminActivityLogService activityLogs)
    {
        _products = products;
        _activityLogs = activityLogs;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountingProductDto>>> GetProducts(CancellationToken ct)
    {
        return Ok(await _products.GetProductsAsync(ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AccountingProductDto>> GetProduct(int id, CancellationToken ct)
    {
        var result = await _products.GetProductAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:int}/pricing")]
    public async Task<ActionResult<AccountingProductDto>> UpdatePricing(
        int id,
        [FromBody] UpdateProductAccountingRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _products.UpdateProductAccountingAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Updated accounting price and margin threshold for '{result.Name}'",
                entityId: id.ToString(),
                entityLabel: result.Name,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/bom")]
    public async Task<ActionResult<AccountingProductDto>> SaveBom(
        int id,
        [FromBody] SaveProductBomRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _products.SaveBomAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Updated BOM for '{result.Name}'",
                entityId: id.ToString(),
                entityLabel: result.Name,
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
            return BadRequest(new { message = "The calculated BOM cost is too large." });
        }
    }

    [HttpPut("{id:int}/internal-component")]
    public async Task<ActionResult<AccountingProductDto>> SetInternalComponent(
        int id,
        [FromBody] SetInternalComponentRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _products.SetInternalComponentAsync(id, request.IsInternalComponent, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Set '{result.Name}' internal component flag to {request.IsInternalComponent}",
                entityId: id.ToString(),
                entityLabel: result.Name,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/sale-components")]
    public async Task<ActionResult<AccountingProductDto>> SaveSaleComponents(
        int id,
        [FromBody] SaveProductSaleComponentsRequest request,
        CancellationToken ct)
    {
        try
        {
            var (actorId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            var result = await _products.SaveSaleComponentsAsync(id, request, actorId, ct);
            if (result is null)
                return NotFound();
            await _activityLogs.LogAsync(
                "accounting",
                "updated",
                $"Updated sale components for '{result.Name}'",
                entityId: id.ToString(),
                entityLabel: result.Name,
                actorUserId: actorId,
                actorEmail: actorEmail,
                ct: ct);
            return Ok(result);
        }
        catch (AccountingBusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
