namespace EverrichRPG.Domain.Travelers;

public sealed class Traveler
{
    private Traveler()
    {
    }

    public Traveler(
        Guid id,
        string name,
        string variant,
        string gender,
        string ageGroup,
        string hairStyle,
        string top,
        string pants,
        string dialogue,
        string movementType,
        string facing,
        int speed)
    {
        Id = id;
        Name = name;
        Variant = variant;
        Gender = gender;
        AgeGroup = ageGroup;
        HairStyle = hairStyle;
        Top = top;
        Pants = pants;
        Dialogue = dialogue;
        MovementType = movementType;
        Facing = facing;
        Speed = speed;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = "";
    public string Variant { get; private set; } = "";
    public string Gender { get; private set; } = "";
    public string AgeGroup { get; private set; } = "";
    public string HairStyle { get; private set; } = "";
    public string Top { get; private set; } = "";
    public string Pants { get; private set; } = "";
    public string Dialogue { get; private set; } = "";
    public string MovementType { get; private set; } = "";
    public string Facing { get; private set; } = "";
    public int Speed { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTimeOffset CreatedAt { get; private set; }

    public void Rename(string name)
    {
        Name = name;
    }

    public void ChangeAppearance(
        string variant,
        string gender,
        string ageGroup,
        string hairStyle,
        string top,
        string pants)
    {
        Variant = variant;
        Gender = gender;
        AgeGroup = ageGroup;
        HairStyle = hairStyle;
        Top = top;
        Pants = pants;
    }
}
