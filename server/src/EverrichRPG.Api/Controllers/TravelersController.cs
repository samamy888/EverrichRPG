using EverrichRPG.Domain.Travelers;
using EverrichRPG.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EverrichRPG.Api.Controllers;

[ApiController]
[Route("api/v1/travelers")]
public sealed class TravelersController(GameDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TravelerRosterResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TravelerRosterResponse>> GetTravelers(
        CancellationToken cancellationToken)
    {
        var travelers = await QueryActiveTravelers()
            .OrderBy(traveler => traveler.Name)
            .Select(ToResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(new TravelerRosterResponse(2, travelers));
    }

    [HttpGet("random")]
    [ProducesResponseType<TravelerRosterResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TravelerRosterResponse>> GetRandomTravelers(
        [FromQuery] int count = 40,
        CancellationToken cancellationToken = default)
    {
        if (count is < 1 or > 50)
        {
            ModelState.AddModelError(nameof(count), "Count must be between 1 and 50.");
            return ValidationProblem(ModelState);
        }

        var pool = await QueryActiveTravelers()
            .Select(ToResponse())
            .ToArrayAsync(cancellationToken);
        var travelers = SelectBalancedTravelers(pool, count);

        return Ok(new TravelerRosterResponse(2, travelers));
    }

    private IQueryable<Traveler> QueryActiveTravelers()
    {
        return dbContext.Travelers
            .AsNoTracking()
            .Where(traveler => traveler.IsActive);
    }

    private static System.Linq.Expressions.Expression<Func<Traveler, TravelerResponse>>
        ToResponse()
    {
        return traveler => new TravelerResponse(
                traveler.Id,
                traveler.Name,
                traveler.Variant,
                new TravelerAppearanceResponse(
                    traveler.Gender,
                    traveler.AgeGroup,
                    traveler.HairStyle,
                    traveler.Top,
                    traveler.Pants),
                traveler.Dialogue,
                traveler.MovementType,
                traveler.Facing,
                traveler.Speed);
    }

    private static TravelerResponse[] SelectBalancedTravelers(
        IReadOnlyCollection<TravelerResponse> pool,
        int count)
    {
        var buckets = pool
            .OrderBy(_ => Random.Shared.Next())
            .GroupBy(traveler => traveler.Variant)
            .Select(group => new Queue<TravelerResponse>(group))
            .OrderBy(_ => Random.Shared.Next())
            .ToList();
        var selected = new List<TravelerResponse>(count);

        while (selected.Count < count && buckets.Count > 0)
        {
            for (var index = buckets.Count - 1; index >= 0; index--)
            {
                var bucket = buckets[index];
                if (bucket.Count > 0)
                {
                    selected.Add(bucket.Dequeue());
                }

                if (bucket.Count == 0)
                {
                    buckets.RemoveAt(index);
                }

                if (selected.Count >= count)
                {
                    break;
                }
            }
        }

        return selected.ToArray();
    }
}

public sealed record TravelerRosterResponse(
    int SchemaVersion,
    TravelerResponse[] Travelers);

public sealed record TravelerResponse(
    Guid Id,
    string Name,
    string Variant,
    TravelerAppearanceResponse Appearance,
    string Dialogue,
    string MovementType,
    string Facing,
    int Speed);

public sealed record TravelerAppearanceResponse(
    string Gender,
    string AgeGroup,
    string HairStyle,
    string Top,
    string Pants);
