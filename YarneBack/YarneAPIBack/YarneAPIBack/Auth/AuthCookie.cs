using Microsoft.AspNetCore.Http;

namespace YarneAPIBack.Auth;

/// <summary>httpOnly access-token cookie used by the storefront SPA.</summary>
public static class AuthCookie
{
    public const string Name = "yarne_access";
    public const string RefreshName = "yarne_refresh";

    /// <summary>
    /// Cross-origin SPA↔API: SameSite=None + Secure.
    /// Partitioned (CHIPS) so Chromium/Safari still accept the cookie as a third-party cookie
    /// when the storefront and API are on different sites (e.g. yarne-acc.com → Railway).
    /// </summary>
    public static void SetAccessToken(HttpResponse response, string token, DateTime expiresAtUtc)
    {
        response.Cookies.Append(Name, token, BuildOptions(expiresAtUtc, path: "/"));
    }

    public static void SetRefreshToken(HttpResponse response, string token, DateTime expiresAtUtc)
    {
        // Path limited to auth endpoints so the refresh cookie is not sent on every API call.
        response.Cookies.Append(RefreshName, token, BuildOptions(expiresAtUtc, path: "/api/auth"));
    }

    public static void Clear(HttpResponse response)
    {
        response.Cookies.Delete(Name, BuildOptions(expiresAtUtc: null, path: "/"));
        response.Cookies.Delete(RefreshName, BuildOptions(expiresAtUtc: null, path: "/api/auth"));
    }

    public static void ClearAccess(HttpResponse response)
    {
        response.Cookies.Delete(Name, BuildOptions(expiresAtUtc: null, path: "/"));
    }

    private static CookieOptions BuildOptions(DateTime? expiresAtUtc, string path)
    {
        // Partitioned via Extensions: CookieOptions.Partitioned lands in .NET 10; CHIPS needed for
        // cross-site SPA↔API (yarne-acc.com → Railway) under third-party cookie restrictions.
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = path,
            Expires = expiresAtUtc,
            IsEssential = true,
        };
        options.Extensions.Add("Partitioned");
        return options;
    }
}
