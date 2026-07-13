using EverrichRPG.Domain.Commerce;
using EverrichRPG.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
public sealed class ProductsController(GameDbContext dbContext) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create(
        ProductWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!Validate(request)) return ValidationProblem(ModelState);
        if (!await ShopExists(request.ShopId, cancellationToken))
        {
            ModelState.AddModelError(nameof(request.ShopId), "Shop does not exist or is inactive.");
            return ValidationProblem(ModelState);
        }
        if (await SkuExists(request.Sku, null, cancellationToken))
        {
            ModelState.AddModelError(nameof(request.Sku), "SKU is already in use.");
            return ValidationProblem(ModelState);
        }

        var product = new Product(
            $"product-{Guid.NewGuid():N}", request.ShopId.Trim(), request.Name.Trim(),
            request.Description.Trim(), request.Category.Trim(), request.Sku.Trim(),
            request.Price, request.PromotionPrice, request.PromotionStartAt,
            request.PromotionEndAt, request.StockQuantity, request.DisplayOrder);
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/v1/products/{product.Id}", ToResponse(product));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProductResponse>> Update(
        string id,
        ProductWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!Validate(request)) return ValidationProblem(ModelState);
        var product = await dbContext.Products
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken);
        if (product is null) return NotFound();
        if (!await ShopExists(request.ShopId, cancellationToken))
        {
            ModelState.AddModelError(nameof(request.ShopId), "Shop does not exist or is inactive.");
            return ValidationProblem(ModelState);
        }
        if (await SkuExists(request.Sku, id, cancellationToken))
        {
            ModelState.AddModelError(nameof(request.Sku), "SKU is already in use.");
            return ValidationProblem(ModelState);
        }

        if (!string.Equals(product.ShopId, request.ShopId, StringComparison.Ordinal))
        {
            ModelState.AddModelError(nameof(request.ShopId), "Moving a product to another shop is not supported.");
            return ValidationProblem(ModelState);
        }

        product.UpdateCatalogData(
            request.Name.Trim(), request.Description.Trim(), request.Category.Trim(),
            request.Sku.Trim(), request.Price, request.PromotionPrice,
            request.PromotionStartAt, request.PromotionEndAt,
            request.StockQuantity, request.DisplayOrder);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(product));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken);
        if (product is null) return NotFound();
        product.Deactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<bool> ShopExists(string shopId, CancellationToken cancellationToken) =>
        await dbContext.Shops.AnyAsync(
            shop => shop.Id == shopId.Trim() && shop.IsActive, cancellationToken);

    private async Task<bool> SkuExists(
        string sku,
        string? excludedId,
        CancellationToken cancellationToken) =>
        await dbContext.Products.AnyAsync(
            product => product.Sku == sku.Trim() && product.Id != excludedId,
            cancellationToken);

    private bool Validate(ProductWriteRequest request)
    {
        ValidateRequired(nameof(request.ShopId), request.ShopId, 64);
        ValidateRequired(nameof(request.Name), request.Name, 120);
        ValidateRequired(nameof(request.Category), request.Category, 40);
        ValidateRequired(nameof(request.Sku), request.Sku, 40);
        if (request.Description?.Length > 500)
            ModelState.AddModelError(nameof(request.Description), "Description cannot exceed 500 characters.");
        if (request.Price < 0) ModelState.AddModelError(nameof(request.Price), "Price cannot be negative.");
        if (request.PromotionPrice is < 0)
            ModelState.AddModelError(nameof(request.PromotionPrice), "Promotion price cannot be negative.");
        if (request.StockQuantity < 0)
            ModelState.AddModelError(nameof(request.StockQuantity), "Stock cannot be negative.");
        if (request.DisplayOrder < 0)
            ModelState.AddModelError(nameof(request.DisplayOrder), "Display order cannot be negative.");
        if (request.PromotionPrice.HasValue &&
            (!request.PromotionStartAt.HasValue || !request.PromotionEndAt.HasValue))
            ModelState.AddModelError(nameof(request.PromotionPrice), "Promotion dates are required when a promotion price is set.");
        if (request.PromotionStartAt > request.PromotionEndAt)
            ModelState.AddModelError(nameof(request.PromotionEndAt), "Promotion end must be after its start.");
        return ModelState.IsValid;
    }

    private void ValidateRequired(string key, string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) ModelState.AddModelError(key, $"{key} is required.");
        else if (value.Length > maxLength) ModelState.AddModelError(key, $"{key} cannot exceed {maxLength} characters.");
    }

    private static ProductResponse ToResponse(Product product) => new(
        product.Id, product.Name, product.Description, product.Category, product.Sku,
        product.Price, product.PromotionPrice, product.PromotionStartAt,
        product.PromotionEndAt, product.StockQuantity, product.ShopId,
        product.DisplayOrder);
}

public sealed record ProductWriteRequest(
    string ShopId,
    string Name,
    string Description,
    string Category,
    string Sku,
    int Price,
    int? PromotionPrice,
    DateTimeOffset? PromotionStartAt,
    DateTimeOffset? PromotionEndAt,
    int StockQuantity,
    int DisplayOrder);
