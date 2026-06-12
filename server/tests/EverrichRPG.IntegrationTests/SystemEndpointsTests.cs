using System.Net;
using System.Net.Http.Json;
using EverrichRPG.Api.Controllers;
using Microsoft.AspNetCore.Mvc.Testing;

namespace EverrichRPG.IntegrationTests;

public sealed class SystemEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient client;

    public SystemEndpointsTests(WebApplicationFactory<Program> factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await client.GetAsync("/api/v1/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Version_ReturnsApiContractVersion()
    {
        var response = await client.GetFromJsonAsync<ApiVersionResponse>("/api/v1/version");

        Assert.NotNull(response);
        Assert.Equal("EverrichRPG.Api", response.Service);
        Assert.Equal(1, response.ContentSchemaVersion);
    }
}
