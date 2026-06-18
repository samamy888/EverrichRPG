namespace EverrichRPG.Api.Services;

public sealed class ApiLogReader(IConfiguration configuration, IWebHostEnvironment environment)
{
    public string[] ReadRecentLines(int lineCount)
    {
        var directory = ResolveLogDirectory(configuration, environment);
        if (!Directory.Exists(directory)) return [];

        var files = Directory
            .EnumerateFiles(directory, "app-*.clef")
            .Select(path => new FileInfo(path))
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .Take(3)
            .ToArray();
        if (files.Length == 0) return [];

        var lines = new List<string>();
        foreach (var file in files.Reverse())
        {
            lines.AddRange(File.ReadLines(file.FullName));
        }

        return lines
            .TakeLast(Math.Clamp(lineCount, 1, 500))
            .ToArray();
    }

    public static string ResolveLogDirectory(
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var configuredPath = configuration["Serilog:WriteTo:1:Args:path"] ?? "logs/app-.clef";
        var configuredDirectory = Path.GetDirectoryName(configuredPath);
        if (string.IsNullOrWhiteSpace(configuredDirectory))
        {
            configuredDirectory = "logs";
        }
        return Path.IsPathRooted(configuredDirectory)
            ? configuredDirectory
            : Path.Combine(environment.ContentRootPath, configuredDirectory);
    }
}
