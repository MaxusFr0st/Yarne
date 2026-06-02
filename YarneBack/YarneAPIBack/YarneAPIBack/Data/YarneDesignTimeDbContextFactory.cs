using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace YarneAPIBack.Data;

/// <summary>
/// Used by EF Core tools (dotnet ef migrations). Does not read appsettings secrets.
/// Set DATABASE_URL for the target Postgres instance when running migrations.
/// </summary>
public class YarneDesignTimeDbContextFactory : IDesignTimeDbContextFactory<YarneDbContext>
{
    public YarneDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=yarne;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<YarneDbContext>();
        optionsBuilder.UseNpgsql(PostgresConnection.Normalize(connectionString));
        return new YarneDbContext(optionsBuilder.Options);
    }
}
