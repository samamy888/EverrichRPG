using EverrichRPG.Domain.Travelers;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class TravelerRosterSeeder(GameDbContext dbContext)
{
    public const int PoolSize = 180;

    private static readonly string[] FamilyNames =
        ["陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊", "許", "鄭"];

    public static readonly string[] MaleGivenNames =
        ["宇軒", "柏翰", "冠廷", "俊傑", "宥辰", "家豪", "志明", "建宏", "承恩", "彥廷"];

    public static readonly string[] FemaleGivenNames =
        ["子晴", "雅婷", "品妤", "思妤", "欣怡", "語彤", "婉婷", "佳穎", "佩珊", "心瑜"];

    private static readonly string[] Dialogue =
    [
        "第一次來這裡，免稅店比我想像中還熱鬧。",
        "我正在找適合帶回家的伴手禮。",
        "這裡的指標很清楚，逛起來很舒服。",
        "候機前慢慢逛一下，時間過得真快。",
        "你有推薦的商品嗎？我還在猶豫呢。",
        "免稅價格挺吸引人的，我想再比較一下。",
        "準備挑一份禮物送給家人。",
        "逛完這一區，我就要去結帳了。"
    ];

    public static readonly string[] Variants =
    [
        "male",
        "female",
        "child-male",
        "child-female",
        "elder-male",
        "elder-female",
        "paperdoll-blue-male",
        "paperdoll-green-male",
        "paperdoll-beige-male",
        "paperdoll-yellow-male",
        "paperdoll-coral-female",
        "paperdoll-yellow-female",
        "paperdoll-lavender-female"
    ];
    private static readonly TravelerAppearance[] AppearanceCatalog =
    [
        new("male", "adult", "tousled-brown", "blue-travel-jacket", "dark-trousers", "paperdoll-blue-male"),
        new("male", "adult", "sidepart-black", "green-hoodie", "beige-chinos", "paperdoll-green-male"),
        new("male", "adult", "tousled-brown", "beige-cardigan", "charcoal-pants", "paperdoll-beige-male"),
        new("male", "adult", "sidepart-black", "yellow-cardigan", "dark-trousers", "paperdoll-yellow-male"),
        new("female", "adult", "bob-brown", "coral-jacket", "navy-pants", "paperdoll-coral-female"),
        new("female", "adult", "bob-brown", "yellow-cardigan", "teal-skirt", "paperdoll-yellow-female"),
        new("female", "adult", "silver-bob", "lavender-cardigan", "dark-skirt", "paperdoll-lavender-female"),
        new("male", "child", "tousled-brown", "green-hoodie", "dark-trousers", "child-male"),
        new("female", "child", "bob-brown", "yellow-cardigan", "teal-skirt", "child-female"),
        new("male", "elder", "silver-short", "beige-cardigan", "charcoal-pants", "elder-male"),
        new("female", "elder", "silver-bob", "lavender-cardigan", "dark-skirt", "elder-female")
    ];
    private static readonly string[] MovementTypes = ["wander", "wander", "wander", "patrol", "idle"];
    private static readonly string[] Facings = ["up", "down", "left", "right"];

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var existingTravelers = await dbContext.Travelers
            .ToArrayAsync(cancellationToken);

        var random = Random.Shared;
        var usedNames = new HashSet<string>(StringComparer.Ordinal);
        var hasChanges = false;

        foreach (var traveler in existingTravelers)
        {
            var appearance = ResolveAppearance(traveler.Variant);
            if (string.IsNullOrWhiteSpace(traveler.Gender) ||
                string.IsNullOrWhiteSpace(traveler.AgeGroup) ||
                string.IsNullOrWhiteSpace(traveler.HairStyle) ||
                string.IsNullOrWhiteSpace(traveler.Top) ||
                string.IsNullOrWhiteSpace(traveler.Pants))
            {
                traveler.ChangeAppearance(
                    appearance.Variant,
                    appearance.Gender,
                    appearance.AgeGroup,
                    appearance.HairStyle,
                    appearance.Top,
                    appearance.Pants);
                hasChanges = true;
            }

            if (IsNameCompatibleWithVariant(traveler.Name, traveler.Variant) &&
                usedNames.Add(traveler.Name))
            {
                continue;
            }

            traveler.Rename(CreateUniqueName(random, usedNames, traveler.Variant));
            hasChanges = true;
        }

        var travelers = new List<Traveler>();

        for (var index = existingTravelers.Length; index < PoolSize; index++)
        {
            var appearance = AppearanceCatalog[index % AppearanceCatalog.Length];
            travelers.Add(new Traveler(
                Guid.NewGuid(),
                CreateUniqueName(random, usedNames, appearance.Variant),
                appearance.Variant,
                appearance.Gender,
                appearance.AgeGroup,
                appearance.HairStyle,
                appearance.Top,
                appearance.Pants,
                Pick(random, Dialogue),
                Pick(random, MovementTypes),
                Pick(random, Facings),
                random.Next(34, 59)));
        }

        if (travelers.Count > 0)
        {
            await dbContext.Travelers.AddRangeAsync(travelers, cancellationToken);
            hasChanges = true;
        }

        if (hasChanges)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public static bool IsNameCompatibleWithVariant(string name, string variant)
    {
        return GetGivenNames(variant).Any(name.EndsWith);
    }

    private static string CreateUniqueName(
        Random random,
        ISet<string> usedNames,
        string variant)
    {
        var givenNames = GetGivenNames(variant);
        var availableNames = FamilyNames
            .SelectMany(familyName =>
                givenNames.Select(givenName => $"{familyName}{givenName}"))
            .Where(name => !usedNames.Contains(name))
            .ToArray();
        if (availableNames.Length == 0)
        {
            return CreateNumberedName(random, usedNames, givenNames);
        }

        var name = Pick(random, availableNames);
        usedNames.Add(name);
        return name;
    }

    private static string CreateNumberedName(
        Random random,
        ISet<string> usedNames,
        IReadOnlyList<string> givenNames)
    {
        for (var attempt = 1; attempt <= 999; attempt++)
        {
            var name = $"{Pick(random, FamilyNames)}{Pick(random, givenNames)}{attempt:00}";
            if (usedNames.Add(name))
            {
                return name;
            }
        }

        throw new InvalidOperationException("No unused traveler names remain.");
    }

    private static IReadOnlyList<string> GetGivenNames(string variant)
    {
        return variant switch
        {
            "male" or "child-male" or "elder-male" or
                "paperdoll-blue-male" or "paperdoll-green-male" or
                "paperdoll-beige-male" or "paperdoll-yellow-male" => MaleGivenNames,
            "female" or "child-female" or "elder-female" or
                "paperdoll-coral-female" or "paperdoll-yellow-female" or
                "paperdoll-lavender-female" => FemaleGivenNames,
            _ => throw new ArgumentOutOfRangeException(
                nameof(variant),
                variant,
                "Traveler variant must be one of the supported traveler appearances.")
        };
    }

    private static TravelerAppearance ResolveAppearance(string variant)
    {
        return AppearanceCatalog.FirstOrDefault(appearance => appearance.Variant == variant) ??
            (GetGivenNames(variant) == MaleGivenNames
                ? AppearanceCatalog[0]
                : AppearanceCatalog[2]);
    }

    private static T Pick<T>(Random random, IReadOnlyList<T> values)
    {
        return values[random.Next(values.Count)];
    }

    private sealed record TravelerAppearance(
        string Gender,
        string AgeGroup,
        string HairStyle,
        string Top,
        string Pants,
        string Variant);
}
