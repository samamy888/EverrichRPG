namespace EverrichRPG.Domain.Commerce;

public sealed class Product
{
    private Product()
    {
    }

    public Product(
        string id,
        string shopId,
        string name,
        string description,
        string category,
        string sku,
        int price,
        int? promotionPrice,
        DateTimeOffset? promotionStartAt,
        DateTimeOffset? promotionEndAt,
        int stockQuantity,
        int displayOrder)
    {
        Id = id;
        ShopId = shopId;
        Name = name;
        Description = description;
        Category = category;
        Sku = sku;
        Price = price;
        PromotionPrice = promotionPrice;
        PromotionStartAt = promotionStartAt;
        PromotionEndAt = promotionEndAt;
        StockQuantity = stockQuantity;
        DisplayOrder = displayOrder;
    }

    public string Id { get; private set; } = "";
    public string ShopId { get; private set; } = "";
    public string Name { get; private set; } = "";
    public string Description { get; private set; } = "";
    public string Category { get; private set; } = "";
    public string Sku { get; private set; } = "";
    public int Price { get; private set; }
    public int? PromotionPrice { get; private set; }
    public DateTimeOffset? PromotionStartAt { get; private set; }
    public DateTimeOffset? PromotionEndAt { get; private set; }
    public int StockQuantity { get; private set; }
    public int DisplayOrder { get; private set; }
    public bool IsActive { get; private set; } = true;
    public Shop Shop { get; private set; } = null!;

    public void UpdateCatalogData(
        string name,
        string description,
        string category,
        string sku,
        int price,
        int? promotionPrice,
        DateTimeOffset? promotionStartAt,
        DateTimeOffset? promotionEndAt,
        int stockQuantity,
        int displayOrder)
    {
        Name = name;
        Description = description;
        Category = category;
        Sku = sku;
        Price = price;
        PromotionPrice = promotionPrice;
        PromotionStartAt = promotionStartAt;
        PromotionEndAt = promotionEndAt;
        StockQuantity = stockQuantity;
        DisplayOrder = displayOrder;
        IsActive = true;
    }
}
