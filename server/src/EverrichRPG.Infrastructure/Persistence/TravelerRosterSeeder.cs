using EverrichRPG.Domain.Travelers;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Infrastructure.Persistence;

public sealed class TravelerRosterSeeder(GameDbContext dbContext)
{
    public const int PoolSize = 100;

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

    private static readonly string[] Variants = ["male", "female"];
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
            var variant = Pick(random, Variants);
            travelers.Add(new Traveler(
                Guid.NewGuid(),
                CreateUniqueName(random, usedNames, variant),
                variant,
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
            throw new InvalidOperationException(
                $"No unused traveler names remain for variant '{variant}'.");
        }

        var name = Pick(random, availableNames);
        usedNames.Add(name);
        return name;
    }

    private static IReadOnlyList<string> GetGivenNames(string variant)
    {
        return variant switch
        {
            "male" => MaleGivenNames,
            "female" => FemaleGivenNames,
            _ => throw new ArgumentOutOfRangeException(
                nameof(variant),
                variant,
                "Traveler variant must be male or female.")
        };
    }

    private static T Pick<T>(Random random, IReadOnlyList<T> values)
    {
        return values[random.Next(values.Count)];
    }
}
