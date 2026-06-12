using Microsoft.AspNetCore.Mvc;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class SystemController : ControllerBase
{
    [HttpGet("version")]
    [ProducesResponseType<ApiVersionResponse>(StatusCodes.Status200OK)]
    public ActionResult<ApiVersionResponse> GetVersion()
    {
        var assemblyVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "unknown";
        return Ok(new ApiVersionResponse("EverrichRPG.Api", assemblyVersion, 1));
    }
}

public sealed record ApiVersionResponse(string Service, string Version, int ContentSchemaVersion);
