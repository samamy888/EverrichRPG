using System.Text.Json;
using EverrichRpg.Server.Models;

namespace EverrichRpg.Server.Services;

public class FileStateStore : IStateStore
{
    private readonly object _gate = new();
    private readonly Dictionary<string, PlayerState> _online = new();
    private readonly LinkedList<ChatMessage> _chat = new();
    private readonly Dictionary<string, PlayerProfile> _profiles = new();
    private readonly Dictionary<string, string> _genderByConn = new();
    private readonly Dictionary<string, string> _aidByConn = new();
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
                    profiles = _profiles.Values,
                    genders = _genderByConn,
                    aids = _aidByConn,
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
                _profiles.Clear();
                if (root.TryGetProperty("profiles", out var profiles))
                {
                    foreach (var p in profiles.EnumerateArray())
                    {
                        var pr = new PlayerProfile(
                            p.GetProperty("Id").GetString()!,
                            p.GetProperty("Email").GetString()!,
                            p.GetProperty("Name").GetString()!,
                            p.GetProperty("Gender").GetString()!,
                            DateTimeOffset.Parse(p.GetProperty("Ts").GetString()!));
                        _profiles[pr.Id] = pr;
                    }
                }
                _genderByConn.Clear();
                if (root.TryGetProperty("genders", out var genders))
                {
                    foreach (var kv in genders.EnumerateObject())
                    {
                        _genderByConn[kv.Name] = kv.Value.GetString() ?? "M";
                    }
                }
                _aidByConn.Clear();
                if (root.TryGetProperty("aids", out var aids))
                {
                    foreach (var kv in aids.EnumerateObject())
                    {
                        _aidByConn[kv.Name] = kv.Value.GetString() ?? kv.Name;
                    }
                }
            }
        }
        catch { }
    }

    public void UpsertProfile(PlayerProfile p)
    {
        lock (_gate) { _profiles[p.Id] = p with { Ts = DateTimeOffset.UtcNow }; }
    }

    public PlayerProfile? GetProfile(string id)
    {
        lock (_gate) return _profiles.TryGetValue(id, out var v) ? v : null;
    }

    public void SetGender(string connId, string gender)
    {
        lock (_gate) _genderByConn[connId] = string.IsNullOrWhiteSpace(gender) ? "M" : gender.ToUpperInvariant();
    }

    public string? GetGender(string connId)
    {
        lock (_gate) return _genderByConn.TryGetValue(connId, out var v) ? v : null;
    }

    public void SetAid(string connId, string aid)
    {
        lock (_gate) _aidByConn[connId] = string.IsNullOrWhiteSpace(aid) ? connId : aid;
    }

    public string? GetAid(string connId)
    {
        lock (_gate) return _aidByConn.TryGetValue(connId, out var v) ? v : null;
    }

    // Ensure metadata cleared when player leaves
    public new void RemovePlayer(string id)
    {
        lock (_gate)
        {
            _online.Remove(id);
            _genderByConn.Remove(id);
            _aidByConn.Remove(id);
        }
    }
}
