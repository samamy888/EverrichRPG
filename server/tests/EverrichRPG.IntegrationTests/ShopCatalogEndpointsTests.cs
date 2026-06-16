using System.Net;
using System.Net.Http.Json;
using EverrichRPG.Api.Controllers;
namespace EverrichRPG.IntegrationTests;

public sealed class ShopCatalogEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient client;

    public ShopCatalogEndpointsTests(ApiFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Catalog_ReturnsAllShopsAndProducts()
    {
        var response = await client.GetAsync("/api/v1/shops/catalog");
        var catalog = await response.Content.ReadFromJsonAsync<ShopCatalogResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(catalog);
        Assert.Equal(3, catalog.Shops.Length);
        Assert.Equal(12, catalog.Products.Length);
    }

    [Fact]
    public async Task ShopProducts_ReturnsProductsForRequestedShop()
    {
        var response = await client.GetAsync("/api/v1/shops/shop-beauty-01/products");
        var products = await response.Content.ReadFromJsonAsync<IReadOnlyList<ProductResponse>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(products);
        Assert.Equal(4, products.Count);
        Assert.All(products, product => Assert.Equal("shop-beauty-01", product.StoreId));
        Assert.All(products, product => Assert.False(string.IsNullOrWhiteSpace(product.Sku)));
        Assert.All(products, product => Assert.True(product.Price > 0));
        Assert.All(products, product => Assert.True(product.StockQuantity > 0));
        Assert.Contains(products, product =>
            product.PromotionPrice is > 0 &&
            product.PromotionStartAt.HasValue &&
            product.PromotionEndAt.HasValue);
        Assert.Contains(products, product =>
            product.PromotionPrice is null &&
            product.PromotionStartAt is null &&
            product.PromotionEndAt is null);
    }
}
