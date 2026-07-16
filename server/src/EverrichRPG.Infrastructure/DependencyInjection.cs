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
        var provider = configuration["Database:Provider"] ?? "MySql";

        services.AddDbContext<AppDbContext>(options =>
        {
            if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
            {
                options.UseInMemoryDatabase($"EverrichRPG-{Guid.NewGuid():N}");
                return;
            }

            if (!provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Unsupported database provider '{provider}'. Use MySql or InMemory.");
            }

            var connectionString = configuration.GetConnectionString("AppDatabase")
                ?? throw new InvalidOperationException(
                    "Connection string 'AppDatabase' is not configured.");
            options.UseMySQL(connectionString);
        });

        return services;
    }
}
