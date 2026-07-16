using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySql.Data.MySqlClient;

namespace EverrichRPG.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        IConfiguration configuration,
        bool recreateDatabase = false,
        CancellationToken cancellationToken = default)
    {
        if (!bool.TryParse(configuration["Database:ApplyMigrations"], out var applyMigrations) ||
            !applyMigrations) return;

        var provider = configuration["Database:Provider"] ?? "MySql";
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        if (!provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Unsupported database provider '{provider}'.");

        await EnsureMySqlDatabaseExistsAsync(configuration, cancellationToken);
        if (recreateDatabase)
        {
            await dbContext.Database.EnsureDeletedAsync(cancellationToken);
            await EnsureMySqlDatabaseExistsAsync(configuration, cancellationToken);
        }
        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    private static async Task EnsureMySqlDatabaseExistsAsync(
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var connectionString = configuration.GetConnectionString("AppDatabase")
            ?? throw new InvalidOperationException("Connection string 'AppDatabase' is not configured.");
        var builder = new MySqlConnectionStringBuilder(connectionString);
        var databaseName = builder.Database;
        if (string.IsNullOrWhiteSpace(databaseName))
            throw new InvalidOperationException("MySQL connection string must include a Database value.");

        builder.Database = string.Empty;
        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"CREATE DATABASE IF NOT EXISTS `{databaseName.Replace("`", "``")}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
