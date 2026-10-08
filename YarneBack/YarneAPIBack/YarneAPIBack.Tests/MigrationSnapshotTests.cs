using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;

namespace YarneAPIBack.Tests;

public class MigrationSnapshotTests
{
    /// <summary>
    /// The migrations here are written by hand. If the model snapshot falls behind the model, EF refuses
    /// to run ANY migration at startup, the app starts anyway, and every order query fails on a missing column.
    /// </summary>
    [Fact]
    public void Model_snapshot_matches_the_model()
    {
        // No connection is opened: the comparison is between the compiled model and the snapshot.
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused")
            .Options;
        using var db = new YarneDbContext(options);

        Assert.False(db.Database.HasPendingModelChanges());
    }
}
