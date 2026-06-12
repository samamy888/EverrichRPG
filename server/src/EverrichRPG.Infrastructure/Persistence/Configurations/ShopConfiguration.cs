using EverrichRPG.Domain.Commerce;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EverrichRPG.Infrastructure.Persistence.Configurations;

public sealed class ShopConfiguration : IEntityTypeConfiguration<Shop>
{
    public void Configure(EntityTypeBuilder<Shop> builder)
    {
        builder.ToTable("Shops");
        builder.HasKey(shop => shop.Id);
        builder.Property(shop => shop.Id).HasMaxLength(64);
        builder.Property(shop => shop.Name).HasMaxLength(120);
        builder.Property(shop => shop.Welcome).HasMaxLength(500);
        builder.Property(shop => shop.ClerkMessage).HasMaxLength(500);
        builder.HasMany(shop => shop.Products)
            .WithOne(product => product.Shop)
            .HasForeignKey(product => product.ShopId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
