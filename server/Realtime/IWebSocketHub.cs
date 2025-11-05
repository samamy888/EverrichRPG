using Microsoft.AspNetCore.Http;

namespace EverrichRpg.Server.Realtime;

public interface IWebSocketHub
{
    Task AcceptAsync(HttpContext ctx);
}

