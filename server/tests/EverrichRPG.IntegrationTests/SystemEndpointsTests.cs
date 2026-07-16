using System.Net;
using System.Net.Http.Json;

namespace EverrichRPG.IntegrationTests;

public sealed class SystemEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/v1/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task System_ReturnsArchitectureStatus()
    {
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/v1/system");
        var body = await response.Content.ReadFromJsonAsync<SystemStatus>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Everrich RPG", body?.Name);
    }

    private sealed record SystemStatus(string Name, string Environment, string Version);
}
