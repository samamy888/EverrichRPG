namespace EverrichRPG.Domain.Players;

public sealed class Player
{
    private Player()
    {
    }

    public Player(Guid id, DateTimeOffset createdAt)
    {
        Id = id;
        CreatedAt = createdAt;
        LastSeenAt = createdAt;
    }

    public Guid Id { get; private set; }
    public string? DisplayName { get; private set; }
    public PlayerType Type { get; private set; } = PlayerType.Anonymous;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset LastSeenAt { get; private set; }
    public PlayerSave? Save { get; private set; }

    public void MarkSeen(DateTimeOffset timestamp)
    {
        LastSeenAt = timestamp;
    }
}
