using System.Text.Json;
using EverrichRPG.Domain.Commerce;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class CommerceCatalogSeeder(GameDbContext dbContext)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var catalogPath = Path.Combine(AppContext.BaseDirectory, "Content", "shop-catalog.json");
        await using var catalogStream = File.OpenRead(catalogPath);
        var catalog = await JsonSerializer.DeserializeAsync<CatalogSeed>(
            catalogStream,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            },
            cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Shop catalog seed file is invalid.");

        var existingShops = await dbContext.Shops
            .ToDictionaryAsync(shop => shop.Id, cancellationToken);
        var newShops = catalog.Shops
            .Where(shop => !existingShops.ContainsKey(shop.Id))
            .Select(shop => new Shop(shop.Id, shop.Name, shop.Welcome, shop.ClerkMessage))
            .ToArray();
        await dbContext.Shops.AddRangeAsync(newShops, cancellationToken);

        var existingProducts = await dbContext.Products
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        var displayOrderByShop = new Dictionary<string, int>();
        var newProducts = new List<Product>();
        foreach (var product in catalog.Products)
        {
            displayOrderByShop.TryGetValue(product.StoreId, out var displayOrder);
            displayOrderByShop[product.StoreId] = displayOrder + 1;

            if (existingProducts.TryGetValue(product.Id, out var existingProduct))
            {
                existingProduct.UpdateCatalogData(
                    product.Name,
                    product.Description,
                    product.Category,
                    product.Sku,
                    product.Price,
                    product.PromotionPrice,
                    product.PromotionStartAt,
                    product.PromotionEndAt,
                    product.StockQuantity,
                    displayOrder);
                continue;
            }

            newProducts.Add(new Product(
                product.Id,
                product.StoreId,
                product.Name,
                product.Description,
                product.Category,
                product.Sku,
                product.Price,
                product.PromotionPrice,
                product.PromotionStartAt,
                product.PromotionEndAt,
                product.StockQuantity,
                displayOrder));
        }

        await dbContext.Products.AddRangeAsync(newProducts, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private sealed record CatalogSeed(int SchemaVersion, ShopSeed[] Shops, ProductSeed[] Products);
    private sealed record ShopSeed(
        string Id,
        string Name,
        string Welcome,
        string ClerkMessage,
        string[] ProductIds);
    private sealed record ProductSeed(
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
}
