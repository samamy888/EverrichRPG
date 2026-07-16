using System.Diagnostics;

namespace EverrichRPG.Api.Middleware;

public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await next(context);
        }
        finally
        {
            logger.LogInformation(
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs} ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.Elapsed.TotalMilliseconds);
        }
    }
}
