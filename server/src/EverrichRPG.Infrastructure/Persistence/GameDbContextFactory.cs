using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class GameDbContextFactory : IDesignTimeDbContextFactory<GameDbContext>
{
    public GameDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<GameDbContext>()
            .UseMySQL("Server=127.0.0.1;Port=3306;Database=everrich_rpg_design;User=root;Password=design-time-only")
            .Options;
        return new GameDbContext(options);
    }
}
