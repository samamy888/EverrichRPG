using EverrichRPG.Domain.Travelers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EverrichRPG.Infrastructure.Persistence.Configurations;

public sealed class TravelerConfiguration : IEntityTypeConfiguration<Traveler>
{
    public void Configure(EntityTypeBuilder<Traveler> builder)
    {
        builder.ToTable("Travelers");
        builder.HasKey(traveler => traveler.Id);
        builder.Property(traveler => traveler.Name).HasMaxLength(80);
        builder.Property(traveler => traveler.Variant).HasMaxLength(16);
        builder.Property(traveler => traveler.Dialogue).HasMaxLength(500);
        builder.Property(traveler => traveler.MovementType).HasMaxLength(16);
        builder.Property(traveler => traveler.Facing).HasMaxLength(16);
        builder.HasIndex(traveler => traveler.IsActive);
    }
}
