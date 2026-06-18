using EverrichRPG.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1/diagnostics")]
public sealed class DiagnosticsController(
    IConfiguration configuration,
    ApiLogReader logReader) : ControllerBase
{
    [HttpGet("logs/recent")]
    [ProducesResponseType<RecentLogsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<RecentLogsResponse> GetRecentLogs([FromQuery] int lines = 120)
    {
        var token = configuration["Diagnostics:LogAccessToken"];
        if (string.IsNullOrWhiteSpace(token))
        {
            return NotFound();
        }

        if (!Request.Headers.TryGetValue("X-Diagnostics-Token", out var providedToken) ||
            providedToken != token)
        {
            return Forbid();
        }

        return Ok(new RecentLogsResponse(logReader.ReadRecentLines(lines)));
    }
}

public sealed record RecentLogsResponse(string[] Lines);
