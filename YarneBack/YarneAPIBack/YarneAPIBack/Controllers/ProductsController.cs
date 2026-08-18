using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.Configuration;
using YarneAPIBack.DTOs.Product;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private const int MaxShareImageSizeBytes = 15 * 1024 * 1024; // 15 MB — normalized to WebP on save

    private readonly IProductService _productService;
    private readonly IAdminActivityLogService _activityLogs;
    private readonly IImageUploadNormalizer _imageNormalizer;
    private readonly IR2ImageStorageService _r2Storage;

    public ProductsController(
        IProductService productService,
        IAdminActivityLogService activityLogs,
        IImageUploadNormalizer imageNormalizer,
        IR2ImageStorageService r2Storage)
    {
        _productService = productService;
        _activityLogs = activityLogs;
        _imageNormalizer = imageNormalizer;
        _r2Storage = r2Storage;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts(
        [FromQuery] string? category = null,
        [FromQuery] bool? isNew = null,
        [FromQuery] int? collectionId = null,
        [FromQuery] bool includeInactive = false,
        [FromQuery] bool includeInternal = false,
        CancellationToken ct = default)
    {
        var isAdmin = User.Identity?.IsAuthenticated == true && User.IsInRole("Admin");
        if ((includeInactive || includeInternal) && !isAdmin)
            return Forbid();

        var products = await _productService.GetProductsAsync(category, isNew, collectionId, includeInactive, includeInternal, ct);
        return Ok(products);
    }

    [HttpGet("{idOrCode}")]
    [ProducesResponseType(typeof(ProductDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDetailDto>> GetProduct(string idOrCode, CancellationToken ct = default)
    {
        ProductDetailDto? product;

        if (int.TryParse(idOrCode, out var id))
        {
            var isAdmin = User.Identity?.IsAuthenticated == true && User.IsInRole("Admin");
            product = await _productService.GetProductByIdAsync(id, activeOnly: !isAdmin, ct);
        }
        else
            product = await _productService.GetProductByCodeAsync(idOrCode, ct);

        if (product == null)
            return NotFound();

        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductDto>> CreateProduct([FromBody] CreateProductRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        ProductDto product;
        try
        {
            product = await _productService.CreateProductAsync(request, ct);
        }
        catch (ProductValidationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message,
                invalidSuggestedCodes = ex.InvalidSuggestedCodes,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        var imageUrls = ProductLogImageHelper.CollectImageUrls(product);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "product",
            "created",
            $"Created product \"{product.Name}\" ({product.ProductCode})",
            product.Id.ToString(),
            product.Name,
            new
            {
                product.ProductCode,
                product.Name,
                product.Price,
                product.CategoryName,
                product.IsNew,
                product.IsBestseller,
                product.Lace,
                imageUrls,
            },
            actorUserId,
            actorEmail,
            ct);

        return CreatedAtAction(nameof(GetProduct), new { idOrCode = product.Id }, product);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> UpdateProduct(int id, [FromBody] UpdateProductRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();

        var existingDetail = await _productService.GetProductByIdAsync(id, ct: ct);
        var beforeImages = existingDetail != null
            ? ProductLogImageHelper.CollectImageUrls(existingDetail)
            : new List<string>();

        ProductDto? product;
        try
        {
            product = await _productService.UpdateProductAsync(id, request, ct);
        }
        catch (ProductValidationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message,
                invalidSuggestedCodes = ex.InvalidSuggestedCodes,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        if (product == null) return NotFound();

        var afterImages = ProductLogImageHelper.CollectImageUrls(product);
        var (addedImageUrls, removedImageUrls) = ProductLogImageHelper.DiffImageUrls(beforeImages, afterImages);

        var updateLog = ProductChangeLogHelper.BuildUpdateLog(existingDetail, product, addedImageUrls, removedImageUrls);
        if (!updateLog.HasChanges)
            return Ok(product);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "product",
            "updated",
            updateLog.Summary,
            product.Id.ToString(),
            product.Name,
            updateLog.Details,
            actorUserId,
            actorEmail,
            ct);

        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> DeleteProduct(int id, CancellationToken ct = default)
    {
        var existing = await _productService.GetProductByIdAsync(id, ct: ct);
        bool deleted;
        try
        {
            deleted = await _productService.DeleteProductAsync(id, ct);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }

        if (!deleted) return NotFound();

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        if (existing != null)
        {
            var imageUrls = ProductLogImageHelper.CollectImageUrls(existing);
            await _activityLogs.LogAsync(
                "product",
                "deleted",
                $"Deleted product \"{existing.Name}\" ({existing.ProductCode})",
                id.ToString(),
                existing.Name,
                new
                {
                    existing.ProductCode,
                    existing.Name,
                    existing.CategoryName,
                    imageUrls,
                    removedImageUrls = imageUrls,
                },
                actorUserId,
                actorEmail,
                ct);
        }

        return NoContent();
    }

    /// <summary>
    /// Uploads the product's dedicated photo for link-share previews and order emails (stored in R2).
    /// Distinct from the storefront product-card gallery managed via /api/images.
    /// </summary>
    [HttpPost("{id}/share-image")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxShareImageSizeBytes)]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> UploadShareImage(int id, IFormFile file, CancellationToken ct = default)
    {
        var existing = await _productService.GetProductByIdAsync(id, ct: ct);
        if (existing == null) return NotFound();

        var uploaded = await ShareImageUploadHelper.UploadAsync(file, _imageNormalizer, _r2Storage, ct);
        if (uploaded.Error != null) return BadRequest(new { message = uploaded.Error });
        var url = uploaded.Url!;

        var product = await _productService.SetShareImageUrlAsync(id, url, ct);
        if (product == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(existing.ShareImageUrl))
            await _r2Storage.DeleteAsync(existing.ShareImageUrl, ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "product",
            "share-image-updated",
            $"Updated share image for \"{product.Name}\" ({product.ProductCode})",
            product.Id.ToString(),
            product.Name,
            new { shareImageUrl = url },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new { shareImageUrl = url });
    }

    [HttpDelete("{id}/share-image")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteShareImage(int id, CancellationToken ct = default)
    {
        var existing = await _productService.GetProductByIdAsync(id, ct: ct);
        if (existing == null) return NotFound();

        await _productService.SetShareImageUrlAsync(id, null, ct);
        if (!string.IsNullOrWhiteSpace(existing.ShareImageUrl))
            await _r2Storage.DeleteAsync(existing.ShareImageUrl, ct);

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "product",
            "share-image-removed",
            $"Removed share image for \"{existing.Name}\" ({existing.ProductCode})",
            id.ToString(),
            existing.Name,
            new { },
            actorUserId,
            actorEmail,
            ct);

        return NoContent();
    }
}
