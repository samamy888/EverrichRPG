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
builder.Services.AddSingleton<ILogSink, FileLogSink>();

var app = builder.Build();

app.UseCors("Frontend");
app.UseWebSockets(new WebSocketOptions
{
    // 定期送 Ping，避免中間代理視為閒置而關閉（例：60s）
    KeepAliveInterval = TimeSpan.FromSeconds(15)
});

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

// REST: logs intake (accept single object or array). Writes JSON Lines per day
app.MapPost("/api/logs", async (HttpRequest req, ILogSink sink, ILoggerFactory lf) =>
{
    try
    {
        using var doc = await System.Text.Json.JsonDocument.ParseAsync(req.Body);
        var root = doc.RootElement;
        var ua = req.Headers["User-Agent"].ToString();
        var referer = req.Headers["Referer"].ToString();
        var ip = req.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";
        if (root.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
            {
                var logObj = new
                {
                    ts = DateTimeOffset.UtcNow,
                    ip,
                    ua,
                    referer,
                    payload = item
                };
                sink.Write(logObj);
            }
        }
        else
        {
            var logObj = new
            {
                ts = DateTimeOffset.UtcNow,
                ip,
                ua,
                referer,
                payload = root
            };
            sink.Write(logObj);
        }
        return Results.Ok(new { ok = true });
    }
    catch (System.Exception ex)
    {
        try { lf.CreateLogger("Logs").LogWarning(ex, "log intake failed"); } catch { }
        return Results.BadRequest();
    }
});

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.Run();
