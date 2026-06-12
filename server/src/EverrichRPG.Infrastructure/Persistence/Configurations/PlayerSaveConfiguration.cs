using EverrichRPG.Domain.Players;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EverrichRPG.Infrastructure.Persistence.Configurations;

public sealed class PlayerSaveConfiguration : IEntityTypeConfiguration<PlayerSave>
{
    public void Configure(EntityTypeBuilder<PlayerSave> builder)
    {
        builder.ToTable("PlayerSaves");
        builder.HasKey(save => save.PlayerId);
        builder.Property(save => save.PlayerVariant).HasConversion<string>().HasMaxLength(16);
        builder.Property(save => save.RegionId).HasMaxLength(64);
        builder.Property(save => save.SpawnId).HasMaxLength(64);
        builder.Property(save => save.Facing).HasConversion<string>().HasMaxLength(16);
        builder.Property(save => save.MovementMode).HasConversion<string>().HasMaxLength(16);
        builder.Property(save => save.ConcurrencyToken).IsConcurrencyToken();
    }
}
