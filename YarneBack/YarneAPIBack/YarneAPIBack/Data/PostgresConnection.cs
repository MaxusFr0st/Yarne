using Npgsql;

namespace YarneAPIBack.Data;

public static class PostgresConnection
{
    public static string Normalize(string input)
    {
        if (input.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            || input.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(input);

            var userInfoParts = uri.UserInfo.Split(':', 2, StringSplitOptions.TrimEntries);
            var username = Uri.UnescapeDataString(userInfoParts.ElementAtOrDefault(0) ?? "");
            var password = Uri.UnescapeDataString(userInfoParts.ElementAtOrDefault(1) ?? "");

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.IsDefaultPort ? 5432 : uri.Port,
                Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
                Username = username,
                Password = password,
            };

            if (!string.IsNullOrWhiteSpace(uri.Query))
            {
                var query = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
                foreach (var pair in query)
                {
                    var kv = pair.Split('=', 2);
                    var key = Uri.UnescapeDataString(kv[0]);
                    var value = Uri.UnescapeDataString(kv.ElementAtOrDefault(1) ?? "");
                    builder[key] = value;
                }
            }

            ApplyRailwaySslDefaults(builder);
            return builder.ConnectionString;
        }

        if (!input.Contains("sslmode=", StringComparison.OrdinalIgnoreCase))
        {
            var builder = new NpgsqlConnectionStringBuilder(input);
            ApplyRailwaySslDefaults(builder);
            return builder.ConnectionString;
        }

        return input;
    }

    /// <summary>
    /// Railway public Postgres endpoints require TLS; private *.railway.internal hosts typically do not.
    /// </summary>
    public static void ApplyRailwaySslDefaults(NpgsqlConnectionStringBuilder builder)
    {
        if (builder.SslMode is SslMode.Require or SslMode.VerifyFull or SslMode.VerifyCA)
            return;

        var host = builder.Host ?? "";
        var isInternal = host.Contains("railway.internal", StringComparison.OrdinalIgnoreCase);
        builder.SslMode = isInternal ? SslMode.Prefer : SslMode.Require;
    }
}
