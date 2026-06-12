using EverrichRPG.Domain.Commerce;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EverrichRPG.Infrastructure.Persistence.Configurations;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");
        builder.HasKey(product => product.Id);
        builder.Property(product => product.Id).HasMaxLength(80);
        builder.Property(product => product.ShopId).HasMaxLength(64);
        builder.Property(product => product.Name).HasMaxLength(120);
        builder.Property(product => product.Description).HasMaxLength(500);
        builder.Property(product => product.Category).HasMaxLength(40);
        builder.Property(product => product.Sku).HasMaxLength(40);
        builder.HasIndex(product => product.Sku).IsUnique();
        builder.HasIndex(product => new { product.ShopId, product.DisplayOrder });
    }
}
