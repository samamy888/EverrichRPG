using System.Diagnostics;

namespace EverrichRPG.Api.Middleware;

public sealed class RequestLoggingMiddleware(
    RequestDelegate next,
    ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var traceId = context.TraceIdentifier;
        context.Response.Headers.TryAdd("X-Trace-Id", traceId);

        using var scope = logger.BeginScope(new Dictionary<string, object>
        {
            ["TraceId"] = traceId
        });

        try
        {
            await next(context);
            stopwatch.Stop();

            logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds}ms traceId={TraceId}",
                context.Request.Method,
                context.Request.Path.Value,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                traceId);
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            logger.LogError(
                exception,
                "HTTP {Method} {Path} failed after {ElapsedMilliseconds}ms traceId={TraceId}",
                context.Request.Method,
                context.Request.Path.Value,
                stopwatch.ElapsedMilliseconds,
                traceId);
            throw;
        }
    }
}
