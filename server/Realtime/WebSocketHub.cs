using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using EverrichRpg.Server.Models;
using EverrichRpg.Server.Services;

namespace EverrichRpg.Server.Realtime;

public class WebSocketHub : IWebSocketHub
{
    private readonly IStateStore _store;
    private readonly ILogger<WebSocketHub> _logger;
    private readonly Dictionary<string, WebSocket> _sockets = new();
    private readonly object _gate = new();

    public WebSocketHub(IStateStore store, ILogger<WebSocketHub> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task AcceptAsync(HttpContext ctx)
    {
        if (!ctx.WebSockets.IsWebSocketRequest)
        {
            ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
        await HandleAsync(ctx, ws);
    }

    private async Task HandleAsync(HttpContext ctx, WebSocket ws)
    {
        var q = ctx.Request.Query;
        var name = q["name"].FirstOrDefault() ?? $"旅客{Random.Shared.Next(1000, 9999)}";
        var id = q["id"].FirstOrDefault() ?? Guid.NewGuid().ToString("N");

        lock (_gate) _sockets[id] = ws;
        _store.UpsertPlayer(id, name, 0, 0, "hall");
        await BroadcastAsync(new { type = "player-joined", id, name });
        await SendAsync(ws, new { type = "welcome", id, name, players = _store.GetOnline() });

        var buffer = new byte[8192];
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close) break;
                var msgJson = Encoding.UTF8.GetString(buffer.AsSpan(0, result.Count));
                HandleMessage(id, name, msgJson);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WebSocket error for {Id}", id);
        }
        finally
        {
            try { await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None); } catch { }
            lock (_gate) _sockets.Remove(id);
            _store.RemovePlayer(id);
            _store.Snapshot();
            await BroadcastAsync(new { type = "player-left", id });
        }
    }

    private void HandleMessage(string id, string name, string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString();
            switch (type)
            {
                case "move":
                {
                    var x = root.GetProperty("x").GetSingle();
                    var y = root.GetProperty("y").GetSingle();
                    var area = root.TryGetProperty("area", out var a) ? a.GetString() ?? "hall" : "hall";
                    _store.UpsertPlayer(id, name, x, y, area);
                    BroadcastAsync(new { type = "player-moved", id, x, y, area, ts = DateTimeOffset.UtcNow }).Forget();
                    break;
                }
                case "chat":
                {
                    var text = root.GetProperty("text").GetString() ?? string.Empty;
                    var msg = new ChatMessage(Guid.NewGuid().ToString("N"), id, name, text, DateTimeOffset.UtcNow);
                    _store.AddChat(msg);
                    BroadcastAsync(new { type = "chat", id = msg.Id, playerId = id, name, text = msg.Text, ts = msg.Ts }).Forget();
                    break;
                }
            }
        }
        catch { }
    }

    private async Task SendAsync(WebSocket ws, object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var seg = new ArraySegment<byte>(Encoding.UTF8.GetBytes(json));
        await ws.SendAsync(seg, WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private async Task BroadcastAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var seg = new ArraySegment<byte>(Encoding.UTF8.GetBytes(json));
        List<WebSocket> targets;
        lock (_gate) targets = _sockets.Values.ToList();
        foreach (var s in targets)
        {
            if (s.State != WebSocketState.Open) continue;
            try { await s.SendAsync(seg, WebSocketMessageType.Text, true, CancellationToken.None); } catch { }
        }
    }
}

static class TaskExt { public static void Forget(this Task t) { } }

