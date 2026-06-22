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
        if (TryResolve(configuration, logger, out var connection))
            return connection;

        throw new InvalidOperationException("PostgreSQL connection string is not configured. See startup logs for Railway setup steps.");
    }

    public static bool TryResolve(IConfiguration configuration, ILogger? logger, out string connectionString)
    {
        var diagnostics = new StringBuilder();
        connectionString = "";

        // Prefer PG* when Railway links Postgres (reliable even if legacy SQL Server DATABASE_URL is still set).
        var fromPg = BuildFromPgEnvironmentVariables();
        if (IsUsable(fromPg, out var pgUsable))
        {
            try
            {
                connectionString = Finalize(pgUsable, "PGHOST/PGUSER/...", logger);
                return true;
            }
            catch (Exception ex)
            {
                Record(diagnostics, "PGHOST/PGUSER/PGDATABASE", Mask(fromPg), $"parse failed: {ex.Message}");
            }
        }
        else
        {
            Record(diagnostics, "PGHOST/PGUSER/PGDATABASE", fromPg, "not set or incomplete");
        }

        foreach (var key in UrlEnvKeys)
        {
            var raw = Environment.GetEnvironmentVariable(key);
            if (TryUseUrl(raw, key, diagnostics, logger, out var connection))
            {
                connectionString = connection;
                return true;
            }
        }

        // In Production/Railway, never fall back to appsettings SQL Server DefaultConnection.
        if (!IsProductionEnvironment())
        {
            var defaultFromConfig = configuration.GetConnectionString("DefaultConnection");
            if (TryUseUrl(defaultFromConfig, "ConnectionStrings:DefaultConnection", diagnostics, logger, out var fromConfig))
            {
                connectionString = fromConfig;
                return true;
            }

            var defaultFromEnv = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
            if (TryUseUrl(defaultFromEnv, "ConnectionStrings__DefaultConnection", diagnostics, logger, out var fromEnv))
            {
                connectionString = fromEnv;
                return true;
            }
        }
        else
        {
            Record(diagnostics, "ConnectionStrings__DefaultConnection", "***", "skipped in Production — remove this variable on Railway API if it contains Server=...");
        }

        logger?.LogError(BuildResolutionHint(diagnostics).ToString());
        return false;
    }

    private static StringBuilder BuildResolutionHint(StringBuilder diagnostics)
    {
        var hint = new StringBuilder();
        hint.AppendLine("[Railway] No PostgreSQL connection string could be resolved.");
        if (diagnostics.Length > 0)
            hint.AppendLine(diagnostics.ToString().TrimEnd());
        hint.AppendLine();
        hint.AppendLine("Fix on the API service (mindful-flexibility) in Railway:");
        hint.AppendLine("  1. Variables → DELETE the variable named DATABASE_URL (yours is still SQL Server, not Postgres).");
        hint.AppendLine("  2. DELETE ConnectionStrings__DefaultConnection.");
        hint.AppendLine("  3. New variable → Variable Reference → Service: Postgres → Variable: DATABASE_URL.");
        hint.AppendLine("     The value must start with postgresql:// (preview in Railway UI).");
        hint.AppendLine("  OR add 5 references from Postgres: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT.");
        hint.AppendLine("  4. Redeploy the API.");
        return hint;
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
            var reason = IsSqlServerStyle(usable)
                ? "STILL SQL SERVER (Server=... or TrustServerCertificate) — delete this variable, then add Postgres → DATABASE_URL reference"
                : "not a PostgreSQL connection (expected postgresql:// or Host=)";
            Record(diagnostics, source, DescribePrefix(raw), reason);
            return false;
        }

        try
        {
            connection = Finalize(usable, source, logger);
            return true;
        }
        catch (Exception ex)
        {
            Record(diagnostics, source, Mask(raw), $"parse failed: {ex.Message}");
            return false;
        }
    }

    private static string Finalize(string usable, string source, ILogger? logger)
    {
        var normalized = PostgresConnection.Normalize(usable);
        var builder = new NpgsqlConnectionStringBuilder(normalized);

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

    private static bool IsSqlServerStyle(string value)
    {
        var v = value.Trim();
        if (v.Length >= 2 && ((v[0] == '"' && v[^1] == '"') || (v[0] == '\'' && v[^1] == '\'')))
            v = v[1..^1].Trim();

        return v.Contains("TrustServerCertificate", StringComparison.OrdinalIgnoreCase)
            || v.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)
            || v.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase)
            || v.StartsWith("Server=", StringComparison.OrdinalIgnoreCase);
    }

    private static string DescribePrefix(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "missing";

        var v = value.Trim();
        if (v.Length >= 2 && ((v[0] == '"' && v[^1] == '"') || (v[0] == '\'' && v[^1] == '\'')))
            v = v[1..^1].Trim();

        return v.Length <= 24 ? $"starts with \"{v}\"" : $"starts with \"{v[..24]}...\"";
    }

    private static bool LooksLikePostgres(string value)
    {
        var v = value.Trim();
        if (v.Length >= 2 && ((v[0] == '"' && v[^1] == '"') || (v[0] == '\'' && v[^1] == '\'')))
            v = v[1..^1].Trim();

        if (v.StartsWith("jdbc:postgresql://", StringComparison.OrdinalIgnoreCase))
            return true;

        if (v.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || v.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (v.Contains("TrustServerCertificate", StringComparison.OrdinalIgnoreCase)
            || v.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)
            || v.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (v.StartsWith("Server=", StringComparison.OrdinalIgnoreCase))
            return false;

        return v.Contains("Host=", StringComparison.OrdinalIgnoreCase);
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

    private static bool IsProductionEnvironment() =>
        string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Production",
            StringComparison.OrdinalIgnoreCase);

    private static string Mask(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return "";
        if (value.Length <= 12)
            return "***";
        return value[..8] + "...";
    }
}
