using Npgsql;

namespace YarneAPIBack.Data;

public static class PostgresConnection
{
    public static string Normalize(string input)
    {
        var value = Sanitize(input);

        if (TryParsePostgresUri(value, out var fromUri))
        {
            ApplyRailwaySslDefaults(fromUri);
            return fromUri.ConnectionString;
        }

        if (IsSqlServerStyle(value))
        {
            throw new InvalidOperationException(
                "Connection string looks like SQL Server, not PostgreSQL. "
                + "On Railway, remove old DATABASE_URL (Server=...) and link Postgres → DATABASE_URL.");
        }

        try
        {
            var builder = new NpgsqlConnectionStringBuilder(value);
            ApplyRailwaySslDefaults(builder);
            return builder.ConnectionString;
        }
        catch (ArgumentException ex)
        {
            throw new InvalidOperationException(
                "PostgreSQL connection string could not be parsed. "
                + "Ensure DATABASE_URL is a postgres:// URL from Railway Postgres (no quotes, not SQL Server).",
                ex);
        }
    }

    public static string? TryNormalizeOrNull(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        try
        {
            return Normalize(input);
        }
        catch (InvalidOperationException)
        {
            return null;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static string Sanitize(string input)
    {
        var value = input.Trim();

        // Railway / copy-paste sometimes wraps the whole value in quotes.
        if (value.Length >= 2
            && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\'')))
        {
            value = value[1..^1].Trim();
        }

        if (value.StartsWith("jdbc:postgresql://", StringComparison.OrdinalIgnoreCase))
            value = "postgresql://" + value["jdbc:postgresql://".Length..];

        return value;
    }

    private static bool TryParsePostgresUri(string value, out NpgsqlConnectionStringBuilder builder)
    {
        builder = new NpgsqlConnectionStringBuilder();

        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            return false;

        var userInfoParts = uri.UserInfo.Split(':', 2, StringSplitOptions.TrimEntries);
        builder.Username = Uri.UnescapeDataString(userInfoParts.ElementAtOrDefault(0) ?? "");
        builder.Password = Uri.UnescapeDataString(userInfoParts.ElementAtOrDefault(1) ?? "");
        builder.Host = uri.Host;
        builder.Port = uri.IsDefaultPort ? 5432 : uri.Port;
        builder.Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));

        if (!string.IsNullOrWhiteSpace(uri.Query))
        {
            var query = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
            foreach (var pair in query)
            {
                var kv = pair.Split('=', 2);
                var key = Uri.UnescapeDataString(kv[0]);
                var queryValue = Uri.UnescapeDataString(kv.ElementAtOrDefault(1) ?? "");
                builder[key] = queryValue;
            }
        }

        return true;
    }

    private static bool IsSqlServerStyle(string value) =>
        value.Contains("TrustServerCertificate", StringComparison.OrdinalIgnoreCase)
        || value.Contains("Trusted_Connection", StringComparison.OrdinalIgnoreCase)
        || value.Contains("Integrated Security", StringComparison.OrdinalIgnoreCase)
        || (value.StartsWith("Server=", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgres", StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Railway public Postgres endpoints require TLS; private *.railway.internal hosts typically do not.
    /// </summary>
    public static void ApplyRailwaySslDefaults(NpgsqlConnectionStringBuilder builder)
    {
        if (builder.SslMode is SslMode.Require or SslMode.VerifyFull or SslMode.VerifyCA)
            return;

        var host = builder.Host ?? "";
        var isInternal = host.Contains("railway.internal", StringComparison.OrdinalIgnoreCase);
        var isLocal = host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || host == "127.0.0.1"
            || host.Equals("::1", StringComparison.OrdinalIgnoreCase);
        builder.SslMode = isInternal || isLocal ? SslMode.Prefer : SslMode.Require;
    }
}
