using Microsoft.AspNetCore.Mvc;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1/system")]
public sealed class SystemController(IHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        name = "Everrich RPG",
        environment = environment.EnvironmentName,
        version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0"
    });
}
