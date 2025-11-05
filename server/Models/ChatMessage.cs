namespace EverrichRpg.Server.Models;

public record ChatMessage(string Id, string PlayerId, string Name, string Text, DateTimeOffset Ts);

