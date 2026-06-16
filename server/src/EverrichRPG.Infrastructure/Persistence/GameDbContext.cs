using EverrichRPG.Domain.Commerce;
using EverrichRPG.Domain.Players;
using EverrichRPG.Domain.Travelers;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class GameDbContext(DbContextOptions<GameDbContext> options)
    : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<PlayerSave> PlayerSaves => Set<PlayerSave>();
    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Traveler> Travelers => Set<Traveler>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GameDbContext).Assembly);
    }
}
