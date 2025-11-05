namespace EverrichRpg.Server.Models;

public record PlayerState(string Id, string Name, float X, float Y, string Area, DateTimeOffset LastSeen);

