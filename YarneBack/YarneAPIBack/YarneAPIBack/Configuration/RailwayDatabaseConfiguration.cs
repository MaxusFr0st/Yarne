using System.Text;
using Npgsql;
using YarneAPIBack.Data;

namespace YarneAPIBack.Configuration;

/// <summary>
/// Resolves PostgreSQL connection strings on Railway (and locally).
/// Supports DATABASE_URL, PG* variables, and appsettings — without using unresolved ${{...}} templates.
/// </summary>
public static class RailwayDatabaseConfiguration
{
    private static readonly string[] UrlEnvKeys =
    [
        "DATABASE_URL",
        "DATABASE_PRIVATE_URL",
        "DATABASE_PUBLIC_URL",
        "POSTGRES_URL",
    ];

    public static string Resolve(IConfiguration configuration, ILogger? logger = null)
    {
        var diagnostics = new StringBuilder();

        // Prefer PG* when Railway links Postgres (reliable even if legacy SQL Server DATABASE_URL is still set).
        var fromPg = BuildFromPgEnvironmentVariables();
        if (IsUsable(fromPg, out var pgUsable))
            return Finalize(pgUsable, "PGHOST/PGUSER/...", logger);

        Record(diagnostics, "PGHOST/PGUSER/PGDATABASE", fromPg, "not set or incomplete");

        foreach (var key in UrlEnvKeys)
        {
            var raw = Environment.GetEnvironmentVariable(key);
            if (TryUseUrl(raw, key, diagnostics, logger, out var connection))
                return connection;
        }

        var defaultFromConfig = configuration.GetConnectionString("DefaultConnection");
        if (TryUseUrl(defaultFromConfig, "ConnectionStrings:DefaultConnection", diagnostics, logger, out var fromConfig))
            return fromConfig;

        var defaultFromEnv = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (TryUseUrl(defaultFromEnv, "ConnectionStrings__DefaultConnection", diagnostics, logger, out var fromEnv))
            return fromEnv;

        var hint = new StringBuilder();
        hint.AppendLine("[Railway] No PostgreSQL connection string could be resolved.");
        hint.AppendLine(diagnostics.ToString().TrimEnd());
        hint.AppendLine();
        hint.AppendLine("Fix on the API service in Railway:");
        hint.AppendLine("  1. Add a PostgreSQL database (or use an existing one).");
        hint.AppendLine("  2. Open API → Variables → New variable → Reference → select Postgres → DATABASE_URL.");
        hint.AppendLine("  3. Remove old SQL Server variables (DATABASE_URL / ConnectionStrings__DefaultConnection with Server=...;TrustServerCertificate=...).");
        hint.AppendLine("  4. Redeploy the API service.");

        logger?.LogError(hint.ToString());
        throw new InvalidOperationException(hint.ToString());
    }

    private static bool TryUseUrl(
        string? raw,
        string source,
        StringBuilder diagnostics,
        ILogger? logger,
        out string connection)
    {
        connection = "";
        if (!IsUsable(raw, out var usable))
        {
            Record(diagnostics, source, raw, DescribeRejection(raw));
            return false;
        }

        if (!LooksLikePostgres(usable))
        {
            Record(diagnostics, source, Mask(raw), "not a PostgreSQL connection (looks like SQL Server or another provider)");
            return false;
        }

        connection = Finalize(usable, source, logger);
        return true;
    }

    private static string Finalize(string usable, string source, ILogger? logger)
    {
        var normalized = PostgresConnection.Normalize(usable);
        var builder = new NpgsqlConnectionStringBuilder(normalized);
        PostgresConnection.ApplyRailwaySslDefaults(builder);

        logger?.LogInformation(
            "[Railway] PostgreSQL configured from {Source}; host={Host}; database={Database}",
            source,
            builder.Host,
            builder.Database);

        return builder.ConnectionString;
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

        return builder.ConnectionString;
    }

    private static bool IsUsable(string? value, out string usable)
    {
        usable = value?.Trim() ?? "";
        if (string.IsNullOrEmpty(usable))
            return false;

        if (usable.Contains("${{", StringComparison.Ordinal))
            return false;

        return true;
    }

    private static bool LooksLikePostgres(string value)
    {
        if (value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (value.Contains("TrustServerCertificate", StringComparison.OrdinalIgnoreCase)
            || value.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)
            || value.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("Server=", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Npgsql key=value form
        return value.Contains("Host=", StringComparison.OrdinalIgnoreCase)
            || value.Contains("Server=", StringComparison.OrdinalIgnoreCase) && value.Contains("Username=", StringComparison.OrdinalIgnoreCase);
    }

    private static string DescribeRejection(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "empty";
        if (raw.Contains("${{", StringComparison.Ordinal))
            return "unresolved Railway template (${{...}}) — use Variable Reference from Postgres service";
        return "invalid";
    }

    private static void Record(StringBuilder diagnostics, string key, string? raw, string reason)
    {
        var present = string.IsNullOrWhiteSpace(raw) ? "missing" : "present";
        diagnostics.AppendLine($"  - {key}: {present} ({reason})");
    }

    private static string Mask(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return "";
        if (value.Length <= 12)
            return "***";
        return value[..8] + "...";
    }
}
