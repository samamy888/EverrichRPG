using EverrichRPG.Domain.Players;

namespace EverrichRPG.UnitTests.Players;

public sealed class PlayerSaveTests
{
    [Fact]
    public void UpdateLocation_UpdatesSaveAndConcurrencyToken()
    {
        var save = new PlayerSave(Guid.NewGuid(), DateTimeOffset.UtcNow);
        var originalToken = save.ConcurrencyToken;
        var updatedAt = DateTimeOffset.UtcNow.AddMinutes(1);

        save.UpdateLocation(
            PlayerVariant.Female,
            "shop-beauty-01",
            "from-central",
            Facing.Down,
            MovementMode.Run,
            updatedAt);

        Assert.Equal(PlayerVariant.Female, save.PlayerVariant);
        Assert.Equal("shop-beauty-01", save.RegionId);
        Assert.Equal("from-central", save.SpawnId);
        Assert.Equal(Facing.Down, save.Facing);
        Assert.Equal(MovementMode.Run, save.MovementMode);
        Assert.Equal(updatedAt, save.UpdatedAt);
        Assert.NotEqual(originalToken, save.ConcurrencyToken);
    }
}
