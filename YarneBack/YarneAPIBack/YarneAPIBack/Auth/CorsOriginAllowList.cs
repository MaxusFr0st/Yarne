using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace YarneAPIBack.Auth;

/// <summary>Shared CORS / CSRF origin allowlist (must match Program.cs CORS policy).</summary>
public static class CorsOriginAllowList
{
    public static bool IsAllowed(string? origin, IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (string.IsNullOrWhiteSpace(origin))
            return false;

        var configured = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        foreach (var o in configured)
        {
            if (string.Equals(o, origin, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        if (!environment.IsDevelopment())
            return false;

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
            return false;

        var isLocalHost = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);

        return isLocalHost && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    /// <summary>Extract Origin, or fall back to Referer origin.</summary>
    public static string? ResolveRequestOrigin(HttpRequest request)
    {
        var origin = request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin))
            return origin;

        var referer = request.Headers.Referer.ToString();
        if (string.IsNullOrWhiteSpace(referer))
            return null;

        if (!Uri.TryCreate(referer, UriKind.Absolute, out var uri))
            return null;

        return $"{uri.Scheme}://{uri.Authority}";
    }
}
