namespace EverrichRPG.Domain.Commerce;

public sealed class Shop
{
    private readonly List<Product> products = [];

    private Shop()
    {
    }

    public Shop(string id, string name, string welcome, string clerkMessage)
    {
        Id = id;
        Name = name;
        Welcome = welcome;
        ClerkMessage = clerkMessage;
    }

    public string Id { get; private set; } = "";
    public string Name { get; private set; } = "";
    public string Welcome { get; private set; } = "";
    public string ClerkMessage { get; private set; } = "";
    public bool IsActive { get; private set; } = true;
    public IReadOnlyCollection<Product> Products => products;
}
