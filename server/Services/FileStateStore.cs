using System.Text.Json;
using EverrichRpg.Server.Models;

namespace EverrichRpg.Server.Services;

public class FileStateStore : IStateStore
{
    private readonly object _gate = new();
    private readonly Dictionary<string, PlayerState> _online = new();
    private readonly LinkedList<ChatMessage> _chat = new();
    private readonly string _snapshotPath;

    public FileStateStore(IHostEnvironment env)
    {
        _snapshotPath = Path.Combine(env.ContentRootPath, "data-snapshot.json");
        TryLoad();
    }

    public IReadOnlyCollection<PlayerState> GetOnline()
    {
        lock (_gate) return _online.Values.ToList();
    }

    public IReadOnlyCollection<ChatMessage> GetChat(int limit)
    {
        lock (_gate) return _chat.Reverse().Take(Math.Max(1, limit)).ToList();
    }

    public void UpsertPlayer(string id, string name, float x, float y, string area)
    {
        lock (_gate)
        {
            _online[id] = new PlayerState(id, name, x, y, area, DateTimeOffset.UtcNow);
        }
    }

    public void RemovePlayer(string id)
    {
        lock (_gate)
        {
            _online.Remove(id);
        }
    }

    public void AddChat(ChatMessage msg)
    {
        lock (_gate)
        {
            _chat.AddLast(msg);
            while (_chat.Count > 200) _chat.RemoveFirst();
        }
    }

    public void Snapshot()
    {
        try
        {
            lock (_gate)
            {
                var payload = new
                {
                    players = _online.Values,
                    chat = _chat.ToArray(),
                    ts = DateTimeOffset.UtcNow,
                };
                File.WriteAllText(_snapshotPath, JsonSerializer.Serialize(payload));
            }
        }
        catch { }
    }

    private void TryLoad()
    {
        try
        {
            if (!File.Exists(_snapshotPath)) return;
            var json = File.ReadAllText(_snapshotPath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            lock (_gate)
            {
                _online.Clear();
                if (root.TryGetProperty("players", out var players))
                {
                    foreach (var p in players.EnumerateArray())
                    {
                        var st = new PlayerState(
                            p.GetProperty("Id").GetString()!,
                            p.GetProperty("Name").GetString()!,
                            p.GetProperty("X").GetSingle(),
                            p.GetProperty("Y").GetSingle(),
                            p.GetProperty("Area").GetString()!,
                            DateTimeOffset.UtcNow);
                        _online[st.Id] = st;
                    }
                }
                _chat.Clear();
                if (root.TryGetProperty("chat", out var chat))
                {
                    foreach (var c in chat.EnumerateArray())
                    {
                        _chat.AddLast(new ChatMessage(
                            c.GetProperty("Id").GetString()!,
                            c.GetProperty("PlayerId").GetString()!,
                            c.GetProperty("Name").GetString()!,
                            c.GetProperty("Text").GetString()!,
                            DateTimeOffset.Parse(c.GetProperty("Ts").GetString()!)));
                    }
                }
            }
        }
        catch { }
    }
}

