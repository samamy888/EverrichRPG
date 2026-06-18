using System.Net;
using System.Net.Http.Json;
using EverrichRPG.Api.Controllers;
using EverrichRPG.Infrastructure.Persistence;
namespace EverrichRPG.IntegrationTests;

public sealed class TravelerEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient client;

    public TravelerEndpointsTests(ApiFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Travelers_ReturnsPermanentNamedPool()
    {
        var response = await client.GetAsync("/api/v1/travelers");
        var roster = await response.Content.ReadFromJsonAsync<TravelerRosterResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(roster);
        Assert.Equal(TravelerRosterSeeder.PoolSize, roster.Travelers.Length);
        Assert.All(roster.Travelers, traveler =>
        {
            Assert.False(string.IsNullOrWhiteSpace(traveler.Name));
            Assert.Contains(traveler.Variant, TravelerRosterSeeder.Variants);
            Assert.False(string.IsNullOrWhiteSpace(traveler.Appearance.Gender));
            Assert.False(string.IsNullOrWhiteSpace(traveler.Appearance.AgeGroup));
            Assert.False(string.IsNullOrWhiteSpace(traveler.Appearance.HairStyle));
            Assert.False(string.IsNullOrWhiteSpace(traveler.Appearance.Top));
            Assert.False(string.IsNullOrWhiteSpace(traveler.Appearance.Pants));
            Assert.True(
                TravelerRosterSeeder.IsNameCompatibleWithVariant(
                    traveler.Name,
                    traveler.Variant),
                $"{traveler.Name} does not match variant {traveler.Variant}.");
        });
        Assert.Equal(
            roster.Travelers.Length,
            roster.Travelers.Select(traveler => traveler.Id).Distinct().Count());
        Assert.Equal(
            roster.Travelers.Length,
            roster.Travelers.Select(traveler => traveler.Name).Distinct().Count());
        Assert.Contains(roster.Travelers, traveler => traveler.Variant.StartsWith("child-"));
        Assert.Contains(roster.Travelers, traveler => traveler.Variant.StartsWith("elder-"));
    }

    [Fact]
    public async Task RandomTravelers_ReturnsRequestedUniqueSelection()
    {
        var roster = await client.GetFromJsonAsync<TravelerRosterResponse>(
            "/api/v1/travelers/random?count=12");

        Assert.NotNull(roster);
        Assert.Equal(12, roster.Travelers.Length);
        Assert.Equal(12, roster.Travelers.Select(traveler => traveler.Id).Distinct().Count());
    }

    [Fact]
    public async Task RandomTravelers_RejectsInvalidCount()
    {
        var response = await client.GetAsync("/api/v1/travelers/random?count=51");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
