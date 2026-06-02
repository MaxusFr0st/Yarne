using Npgsql;
using YarneAPIBack.Data;

namespace YarneAPIBack.Configuration;

/// <summary>
/// Resolves PostgreSQL connection strings on Railway (and locally).
/// Supports DATABASE_URL, DATABASE_PUBLIC_URL, PG* variables, and appsettings — without using unresolved ${{...}} templates.
/// </summary>
public static class RailwayDatabaseConfiguration
{
    public static string Resolve(IConfiguration configuration, ILogger? logger = null)
    {
        foreach (var candidate in GetCandidates(configuration))
        {
            if (!IsUsable(candidate, out var usable))
                continue;

            var normalized = PostgresConnection.Normalize(usable);
            var builder = new NpgsqlConnectionStringBuilder(normalized);
            PostgresConnection.ApplyRailwaySslDefaults(builder);

            logger?.LogInformation(
                "[Railway] Using PostgreSQL host={Host}; database={Database}",
                builder.Host,
                builder.Database);

            return builder.ConnectionString;
        }

        const string hint =
            "[Railway] No PostgreSQL JDBC/connection string configured. "
            + "On the API service, add a variable reference from the Postgres plugin → DATABASE_URL "
            + "(do not leave unresolved ${{...}} placeholders).";

        logger?.LogWarning(hint);
        throw new InvalidOperationException(hint);
    }

    private static IEnumerable<string?> GetCandidates(IConfiguration configuration)
    {
        yield return Environment.GetEnvironmentVariable("DATABASE_URL");
        yield return Environment.GetEnvironmentVariable("DATABASE_PUBLIC_URL");
        yield return configuration.GetConnectionString("DefaultConnection");
        yield return BuildFromPgEnvironmentVariables();
    }

    private static string? BuildFromPgEnvironmentVariables()
    {
        var host = Environment.GetEnvironmentVariable("PGHOST");
        var database = Environment.GetEnvironmentVariable("PGDATABASE");
        var user = Environment.GetEnvironmentVariable("PGUSER");
        var password = Environment.GetEnvironmentVariable("PGPASSWORD");

        if (string.IsNullOrWhiteSpace(host)
            || string.IsNullOrWhiteSpace(database)
            || string.IsNullOrWhiteSpace(user))
        {
            return null;
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Database = database,
            Username = user,
            Password = password ?? "",
        };

        if (int.TryParse(Environment.GetEnvironmentVariable("PGPORT"), out var port))
            builder.Port = port;

        PostgresConnection.ApplyRailwaySslDefaults(builder);
        return builder.ConnectionString;
    }

    private static bool IsUsable(string? value, out string usable)
    {
        usable = value?.Trim() ?? "";
        if (string.IsNullOrEmpty(usable))
            return false;

        // Railway UI templates that were never linked to another service.
        if (usable.Contains("${{", StringComparison.Ordinal))
            return false;

        // Legacy SQL Server strings must not be passed to Npgsql.
        if (usable.Contains("TrustServerCertificate", StringComparison.OrdinalIgnoreCase)
            || usable.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)
            || usable.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }
}
