using System.Text.Json;

namespace EverrichRpg.Server.Services;

public class FileLogSink : ILogSink
{
    private readonly object _gate = new();
    private readonly string _dir;

    public FileLogSink(IHostEnvironment env)
    {
        _dir = Path.Combine(env.ContentRootPath, "logs");
        Directory.CreateDirectory(_dir);
    }

    private string GetPath(DateTimeOffset ts)
    {
        var date = ts.ToString("yyyy-MM-dd");
        return Path.Combine(_dir, $"app-{date}.log");
    }

    public void Write(object logObject)
    {
        try
        {
            var now = DateTimeOffset.UtcNow;
            var path = GetPath(now);
            var json = JsonSerializer.Serialize(logObject);
            lock (_gate)
            {
                File.AppendAllText(path, json + "\n");
            }
        }
        catch { }
    }
}

