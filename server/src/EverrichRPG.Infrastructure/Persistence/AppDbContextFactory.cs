using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__AppDatabase")
            ?? "Server=127.0.0.1;Port=3306;Database=everrich_rpg;User=root;Password=everrich_dev;TreatTinyAsBoolean=true";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySQL(connectionString)
            .Options;
        return new AppDbContext(options);
    }
}
