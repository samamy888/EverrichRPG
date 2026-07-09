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
        var databaseProvider = configuration["Database:Provider"] ?? "MySql";

        if (databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else if (databaseProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
            await EnsureSqliteTravelerAppearanceColumnsAsync(dbContext, cancellationToken);
        }
        else if (databaseProvider.Equals("MySql", StringComparison.OrdinalIgnoreCase) ||
            databaseProvider.Equals("MySQL", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        var catalogSeeder = scope.ServiceProvider.GetRequiredService<CommerceCatalogSeeder>();
        await catalogSeeder.SeedAsync(cancellationToken);
        var travelerSeeder = scope.ServiceProvider.GetRequiredService<TravelerRosterSeeder>();
        await travelerSeeder.SeedAsync(cancellationToken);
    }

    private static async Task EnsureSqliteTravelerAppearanceColumnsAsync(
        GameDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = "PRAGMA table_info('Travelers');";
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                existingColumns.Add(reader.GetString(1));
            }
        }

        foreach (var (name, sql) in new[]
        {
            ("Gender", "ALTER TABLE \"Travelers\" ADD COLUMN \"Gender\" TEXT NOT NULL DEFAULT '';"),
            ("AgeGroup", "ALTER TABLE \"Travelers\" ADD COLUMN \"AgeGroup\" TEXT NOT NULL DEFAULT '';"),
            ("HairStyle", "ALTER TABLE \"Travelers\" ADD COLUMN \"HairStyle\" TEXT NOT NULL DEFAULT '';"),
            ("Top", "ALTER TABLE \"Travelers\" ADD COLUMN \"Top\" TEXT NOT NULL DEFAULT '';"),
            ("Pants", "ALTER TABLE \"Travelers\" ADD COLUMN \"Pants\" TEXT NOT NULL DEFAULT '';")
        })
        {
            if (existingColumns.Contains(name))
            {
                continue;
            }

            await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }
    }
}
