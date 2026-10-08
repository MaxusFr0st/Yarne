using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using YarneAPIBack.Data;

namespace YarneAPIBack.Tests;

/// <summary>
/// The migrations here are written by hand. If the snapshot or any migration's own model cannot be
/// built, EF refuses to run ANY migration at startup, the app starts anyway, and every order query
/// fails on a missing column. No connection is opened by these tests.
/// </summary>
public class MigrationSnapshotTests
{
    private static YarneDbContext NewContext() =>
        new(new DbContextOptionsBuilder<YarneDbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused")
            .Options);

    [Fact]
    public void Model_snapshot_matches_the_model()
    {
        using var db = NewContext();

        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public void Every_migration_builds_its_own_model()
    {
        using var db = NewContext();
        var assembly = db.GetService<IMigrationsAssembly>();

        Assert.NotEmpty(assembly.Migrations);
        foreach (var (id, type) in assembly.Migrations)
        {
            var migration = assembly.CreateMigration(type, db.Database.ProviderName!);
            var built = Record.Exception(() => migration.TargetModel.GetEntityTypes().Count());
            Assert.True(built is null, $"{id}: {built?.Message}");
        }
    }
}
