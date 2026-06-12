using EverrichRPG.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EverrichRPG.Infrastructure;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        if (!bool.TryParse(configuration["Database:ApplyMigrations"], out var applyMigrations) ||
            !applyMigrations)
        {
            return;
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<GameDbContext>();
        var databaseProvider = configuration["Database:Provider"] ?? "PostgreSql";

        if (databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        var catalogSeeder = scope.ServiceProvider.GetRequiredService<CommerceCatalogSeeder>();
        await catalogSeeder.SeedAsync(cancellationToken);
    }
}
