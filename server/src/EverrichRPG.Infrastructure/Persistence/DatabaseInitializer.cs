using EverrichRPG.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySql.Data.MySqlClient;

namespace EverrichRPG.Infrastructure;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        IConfiguration configuration,
        bool recreateDatabase = false,
        CancellationToken cancellationToken = default)
    {
        if (!bool.TryParse(configuration["Database:ApplyMigrations"], out var applyMigrations) ||
            !applyMigrations)
        {
            return;
        }

        var databaseProvider = configuration["Database:Provider"] ?? "MySql";
        var isInMemory = databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase);
        var isMySql = databaseProvider.Equals("MySql", StringComparison.OrdinalIgnoreCase) ||
            databaseProvider.Equals("MySQL", StringComparison.OrdinalIgnoreCase);
        if (!isInMemory && !isMySql)
        {
            throw new InvalidOperationException(
                $"Unsupported database provider '{databaseProvider}'. Use InMemory for tests or MySql for persistent data.");
        }
        if (recreateDatabase && !isMySql)
        {
            throw new InvalidOperationException("Database recreation is only supported for MySql.");
        }

        if (isMySql)
        {
            await EnsureMySqlDatabaseExistsAsync(configuration, cancellationToken);
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<GameDbContext>();

        if (isInMemory)
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }
        else
        {
            if (recreateDatabase)
            {
                await dbContext.Database.EnsureDeletedAsync(cancellationToken);
                await EnsureMySqlDatabaseExistsAsync(configuration, cancellationToken);
            }

            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        var catalogSeeder = scope.ServiceProvider.GetRequiredService<CommerceCatalogSeeder>();
        await catalogSeeder.SeedAsync(cancellationToken);
        var travelerSeeder = scope.ServiceProvider.GetRequiredService<TravelerRosterSeeder>();
        await travelerSeeder.SeedAsync(cancellationToken);
    }

    private static async Task EnsureMySqlDatabaseExistsAsync(
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var connectionString = configuration.GetConnectionString("GameDatabase")
            ?? throw new InvalidOperationException(
                "Connection string 'GameDatabase' is not configured.");
        var builder = new MySqlConnectionStringBuilder(connectionString);
        var databaseName = builder.Database;
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException(
                "MySQL connection string must include a Database value.");
        }

        builder.Database = string.Empty;
        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE DATABASE IF NOT EXISTS `{databaseName.Replace("`", "``")}`
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
