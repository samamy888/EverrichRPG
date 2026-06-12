using EverrichRPG.Domain.Players;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EverrichRPG.Infrastructure.Persistence.Configurations;

public sealed class PlayerConfiguration : IEntityTypeConfiguration<Player>
{
    public void Configure(EntityTypeBuilder<Player> builder)
    {
        builder.ToTable("Players");
        builder.HasKey(player => player.Id);
        builder.Property(player => player.DisplayName).HasMaxLength(80);
        builder.Property(player => player.Type).HasConversion<string>().HasMaxLength(24);
        builder.HasOne(player => player.Save)
            .WithOne(save => save.Player)
            .HasForeignKey<PlayerSave>(save => save.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
