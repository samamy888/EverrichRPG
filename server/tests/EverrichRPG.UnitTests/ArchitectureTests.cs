using EverrichRPG.Domain.Common;

namespace EverrichRPG.UnitTests;

public sealed class ArchitectureTests
{
    private sealed class TestEntity : Entity;

    [Fact]
    public void Entity_AssignsIdentityAndTimestamps()
    {
        var entity = new TestEntity();
        Assert.NotEqual(Guid.Empty, entity.Id);
        Assert.True(entity.CreatedAt <= DateTimeOffset.UtcNow);
    }
}
