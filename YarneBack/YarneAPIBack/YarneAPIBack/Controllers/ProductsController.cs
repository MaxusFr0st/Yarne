using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YarneAPIBack.DTOs.Product;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts(
        [FromQuery] string? category = null,
        [FromQuery] bool? isNew = null,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        if (includeInactive && !(User.Identity?.IsAuthenticated == true && User.IsInRole("Admin")))
            return Forbid();

        var products = await _productService.GetProductsAsync(category, isNew, includeInactive, ct);
        return Ok(products);
    }

    [HttpGet("{idOrCode}")]
    [ProducesResponseType(typeof(ProductDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDetailDto>> GetProduct(string idOrCode, CancellationToken ct = default)
    {
        ProductDetailDto? product;

        if (int.TryParse(idOrCode, out var id))
            product = await _productService.GetProductByIdAsync(id, ct);
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
        var product = await _productService.CreateProductAsync(request, ct);
        return CreatedAtAction(nameof(GetProduct), new { idOrCode = product.Id }, product);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> UpdateProduct(int id, [FromBody] UpdateProductRequest request, CancellationToken ct = default)
    {
        if (request == null) return BadRequest();
        var product = await _productService.UpdateProductAsync(id, request, ct);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteProduct(int id, CancellationToken ct = default)
    {
        var deleted = await _productService.DeleteProductAsync(id, ct);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
