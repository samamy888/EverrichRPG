using System.Net;
using System.Net.Http.Json;
using EverrichRPG.Api.Controllers;

namespace EverrichRPG.IntegrationTests;

public sealed class ManagementCrudEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient client;

    public ManagementCrudEndpointsTests(ApiFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Product_CanBeCreatedUpdatedAndSoftDeleted()
    {
        var sku = $"CRUD-{Guid.NewGuid():N}";
        var create = new ProductWriteRequest(
            "shop-beauty-01", "測試商品", "CRUD integration test", "test", sku,
            100, null, null, null, 5, 99);
        var createResponse = await client.PostAsJsonAsync("/api/v1/products", create);
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.NotNull(product);
        Assert.Equal(99, product.DisplayOrder);

        var update = create with { Name = "更新後商品", Price = 120, StockQuantity = 8 };
        var updateResponse = await client.PutAsJsonAsync($"/api/v1/products/{product.Id}", update);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ProductResponse>();

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.NotNull(updated);
        Assert.Equal("更新後商品", updated.Name);
        Assert.Equal(120, updated.Price);

        var deleteResponse = await client.DeleteAsync($"/api/v1/products/{product.Id}");
        var catalog = await client.GetFromJsonAsync<ShopCatalogResponse>("/api/v1/shops/catalog");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.NotNull(catalog);
        Assert.DoesNotContain(catalog.Products, item => item.Id == product.Id);
    }

    [Fact]
    public async Task Traveler_CanBeCreatedUpdatedAndSoftDeleted()
    {
        var create = new TravelerWriteRequest(
            "後台測試旅客", "paperdoll-blue-male", "male", "adult",
            "tousled-brown", "blue-travel-jacket", "dark-trousers",
            "新增測試對話", "wander", "down", 40);
        var createResponse = await client.PostAsJsonAsync("/api/v1/travelers", create);
        var traveler = await createResponse.Content.ReadFromJsonAsync<TravelerResponse>();

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.NotNull(traveler);

        var update = create with { Name = "更新後旅客", Dialogue = "更新後對話", Speed = 52 };
        var updateResponse = await client.PutAsJsonAsync($"/api/v1/travelers/{traveler.Id}", update);
        var updated = await updateResponse.Content.ReadFromJsonAsync<TravelerResponse>();

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.NotNull(updated);
        Assert.Equal("更新後旅客", updated.Name);
        Assert.Equal(52, updated.Speed);

        var deleteResponse = await client.DeleteAsync($"/api/v1/travelers/{traveler.Id}");
        var roster = await client.GetFromJsonAsync<TravelerRosterResponse>("/api/v1/travelers");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.NotNull(roster);
        Assert.DoesNotContain(roster.Travelers, item => item.Id == traveler.Id);
    }

    [Fact]
    public async Task Product_RejectsPromotionWithoutDateRange()
    {
        var request = new ProductWriteRequest(
            "shop-beauty-01", "無效促銷", "", "test", $"INVALID-{Guid.NewGuid():N}",
            100, 80, null, null, 1, 0);

        var response = await client.PostAsJsonAsync("/api/v1/products", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
