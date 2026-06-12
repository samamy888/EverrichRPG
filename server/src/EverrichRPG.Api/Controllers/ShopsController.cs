using EverrichRPG.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1/shops")]
public sealed class ShopsController(GameDbContext dbContext) : ControllerBase
{
    [HttpGet("catalog")]
    [ProducesResponseType<ShopCatalogResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ShopCatalogResponse>> GetCatalog(
        CancellationToken cancellationToken)
    {
        var shops = await dbContext.Shops
            .AsNoTracking()
            .Where(shop => shop.IsActive)
            .OrderBy(shop => shop.Id)
            .Select(shop => new ShopResponse(
                shop.Id,
                shop.Name,
                shop.Welcome,
                shop.ClerkMessage,
                shop.Products
                    .Where(product => product.IsActive)
                    .OrderBy(product => product.DisplayOrder)
                    .Select(product => product.Id)
                    .ToArray()))
            .ToArrayAsync(cancellationToken);

        var products = await QueryProducts()
            .ToArrayAsync(cancellationToken);

        return Ok(new ShopCatalogResponse(1, shops, products));
    }

    [HttpGet]
    [ProducesResponseType<ShopResponse[]>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ShopResponse[]>> GetShops(CancellationToken cancellationToken)
    {
        var shops = await dbContext.Shops
            .AsNoTracking()
            .Where(shop => shop.IsActive)
            .OrderBy(shop => shop.Id)
            .Select(shop => new ShopResponse(
                shop.Id,
                shop.Name,
                shop.Welcome,
                shop.ClerkMessage,
                shop.Products
                    .Where(product => product.IsActive)
                    .OrderBy(product => product.DisplayOrder)
                    .Select(product => product.Id)
                    .ToArray()))
            .ToArrayAsync(cancellationToken);

        return Ok(shops);
    }

    [HttpGet("{shopId}/products")]
    [ProducesResponseType<ProductResponse[]>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductResponse[]>> GetProducts(
        string shopId,
        CancellationToken cancellationToken)
    {
        var shopExists = await dbContext.Shops
            .AsNoTracking()
            .AnyAsync(shop => shop.Id == shopId && shop.IsActive, cancellationToken);
        if (!shopExists)
        {
            return NotFound();
        }

        var products = await QueryProducts()
            .Where(product => product.StoreId == shopId)
            .ToArrayAsync(cancellationToken);

        return Ok(products);
    }

    private IQueryable<ProductResponse> QueryProducts()
    {
        return dbContext.Products
            .AsNoTracking()
            .Where(product => product.IsActive && product.Shop.IsActive)
            .OrderBy(product => product.ShopId)
            .ThenBy(product => product.DisplayOrder)
            .Select(product => new ProductResponse(
                product.Id,
                product.Name,
                product.Description,
                product.Category,
                product.Sku,
                product.Price,
                product.PromotionPrice,
                product.PromotionStartAt,
                product.PromotionEndAt,
                product.StockQuantity,
                product.ShopId));
    }
}

public sealed record ShopCatalogResponse(
    int SchemaVersion,
    ShopResponse[] Shops,
    ProductResponse[] Products);

public sealed record ShopResponse(
    string Id,
    string Name,
    string Welcome,
    string ClerkMessage,
    string[] ProductIds);

public sealed record ProductResponse(
    string Id,
    string Name,
    string Description,
    string Category,
    string Sku,
    int Price,
    int? PromotionPrice,
    DateTimeOffset? PromotionStartAt,
    DateTimeOffset? PromotionEndAt,
    int StockQuantity,
    string StoreId);
