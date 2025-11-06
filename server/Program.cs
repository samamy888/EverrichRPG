using EverrichRpg.Server.Realtime;
using EverrichRpg.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend",
        p => p.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://www.biudream.com"
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

// REST: upsert player profile
app.MapPost("/api/profile", async (IStateStore store, HttpRequest req) =>
{
    try
    {
        var profile = await System.Text.Json.JsonSerializer.DeserializeAsync<EverrichRpg.Server.Models.PlayerProfile>(req.Body);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Id)) return Results.BadRequest();
        store.UpsertProfile(profile);
        return Results.Ok(new { ok = true });
    }
    catch { return Results.BadRequest(); }
});

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.Run();
