using EverrichRpg.Server.Realtime;
using EverrichRpg.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend",
        p => p.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

builder.Services.AddSingleton<IStateStore, FileStateStore>();
builder.Services.AddSingleton<IWebSocketHub, WebSocketHub>();

var app = builder.Build();

app.UseCors("Frontend");
app.UseWebSockets();

// WebSocket endpoint
app.Map("/ws", async (HttpContext ctx, IWebSocketHub hub) => { await hub.AcceptAsync(ctx); });

// REST: online players snapshot
app.MapGet("/api/players", (IStateStore store) => store.GetOnline());

// REST: chat history (in-memory for now)
app.MapGet("/api/chat", (IStateStore store, int limit = 50) => store.GetChat(limit));

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.Run();
