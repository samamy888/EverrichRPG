using EverrichRPG.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EverrichRPG.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var databaseProvider = configuration["Database:Provider"] ?? "MySql";
        var inMemoryDatabaseName = $"EverrichRPG-{Guid.NewGuid():N}";

        services.AddDbContext<GameDbContext>(options =>
        {
            if (databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
            {
                options.UseInMemoryDatabase(inMemoryDatabaseName);
                return;
            }

            var connectionString = configuration.GetConnectionString("GameDatabase")
                ?? throw new InvalidOperationException(
                    "Connection string 'GameDatabase' is not configured.");
            if (databaseProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                options.UseSqlite(connectionString);
                return;
            }

            if (databaseProvider.Equals("MySql", StringComparison.OrdinalIgnoreCase) ||
                databaseProvider.Equals("MySQL", StringComparison.OrdinalIgnoreCase))
            {
                options.UseMySQL(connectionString);
                return;
            }

            if (databaseProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase))
            {
                options.UseNpgsql(connectionString);
                return;
            }

            throw new InvalidOperationException(
                $"Unsupported database provider '{databaseProvider}'. Use InMemory, Sqlite, MySql, or PostgreSql.");
        });
        services.AddScoped<CommerceCatalogSeeder>();
        services.AddScoped<TravelerRosterSeeder>();

        return services;
    }
}
