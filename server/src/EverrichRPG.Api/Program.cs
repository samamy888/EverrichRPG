using EverrichRPG.Api.Health;
using EverrichRPG.Api.Middleware;
using EverrichRPG.Application;
using EverrichRPG.Infrastructure;
using EverrichRPG.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
var databaseMaintenance = args.Contains("--database-maintenance", StringComparer.OrdinalIgnoreCase);
var recreateDatabase = args.Contains("--recreate-database", StringComparer.OrdinalIgnoreCase);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "EverrichRPG.Api"));

builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    if (origins.Length > 0) policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Everrich RPG API v1");
        options.DocumentTitle = "Everrich RPG API";
    });
}
if (!app.Environment.IsEnvironment("Testing")) app.UseHttpsRedirection();
app.UseCors();
app.UseMiddleware<RequestLoggingMiddleware>();
app.MapHealthChecks("/api/v1/health", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/api/v1/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});
app.MapControllers();

await app.Services.InitializeDatabaseAsync(app.Configuration, recreateDatabase);
if (!databaseMaintenance) app.Run();

public partial class Program;
