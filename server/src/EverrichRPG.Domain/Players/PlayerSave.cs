namespace EverrichRPG.Domain.Players;

public sealed class PlayerSave
{
    private PlayerSave()
    {
    }

    public PlayerSave(Guid playerId, DateTimeOffset updatedAt)
    {
        PlayerId = playerId;
        UpdatedAt = updatedAt;
        ConcurrencyToken = Guid.NewGuid();
    }

    public Guid PlayerId { get; private set; }
    public int SaveVersion { get; private set; } = 1;
    public PlayerVariant PlayerVariant { get; private set; } = PlayerVariant.Male;
    public string RegionId { get; private set; } = "duty-free-entrance";
    public string SpawnId { get; private set; } = "start";
    public Facing Facing { get; private set; } = Facing.Up;
    public MovementMode MovementMode { get; private set; } = MovementMode.Walk;
    public DateTimeOffset UpdatedAt { get; private set; }
    public Guid ConcurrencyToken { get; private set; }
    public Player Player { get; private set; } = null!;

    public void UpdateLocation(
        PlayerVariant playerVariant,
        string regionId,
        string spawnId,
        Facing facing,
        MovementMode movementMode,
        DateTimeOffset updatedAt)
    {
        PlayerVariant = playerVariant;
        RegionId = regionId;
        SpawnId = spawnId;
        Facing = facing;
        MovementMode = movementMode;
        UpdatedAt = updatedAt;
        ConcurrencyToken = Guid.NewGuid();
    }
}
