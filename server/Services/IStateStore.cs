using EverrichRpg.Server.Models;

namespace EverrichRpg.Server.Services;

public interface IStateStore
{
    IReadOnlyCollection<PlayerState> GetOnline();
    IReadOnlyCollection<ChatMessage> GetChat(int limit);
    void UpsertPlayer(string id, string name, float x, float y, string area);
    void RemovePlayer(string id);
    void AddChat(ChatMessage msg);
    void Snapshot();
}

