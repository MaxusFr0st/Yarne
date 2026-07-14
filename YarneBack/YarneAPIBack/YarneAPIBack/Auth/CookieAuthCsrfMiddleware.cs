using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace YarneAPIBack.Auth;

/// <summary>
/// For cookie-authenticated mutating requests (no Bearer header), require Origin/Referer
/// to match the CORS allowlist — mitigates CSRF with SameSite=None cross-origin cookies.
/// </summary>
public sealed class CookieAuthCsrfMiddleware
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE",
    };

    private readonly RequestDelegate _next;

    public CookieAuthCsrfMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        if (MutatingMethods.Contains(context.Request.Method)
            && HasCookieAuthWithoutBearer(context.Request)
            && !IsAuthAnonymousEndpoint(context.Request))
        {
            var origin = CorsOriginAllowList.ResolveRequestOrigin(context.Request);
            if (!CorsOriginAllowList.IsAllowed(origin, configuration, environment))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { message = "Forbidden origin for cookie auth." });
                return;
            }
        }

        await _next(context);
    }

    private static bool HasCookieAuthWithoutBearer(HttpRequest request)
    {
        var auth = request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(auth)
            && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return request.Cookies.ContainsKey(AuthCookie.Name)
            || request.Cookies.ContainsKey(AuthCookie.RefreshName);
    }

    /// <summary>Login/register/oauth/logout set or clear cookies without requiring a prior session Origin match.</summary>
    private static bool IsAuthAnonymousEndpoint(HttpRequest request)
    {
        var path = request.Path.Value ?? "";
        return path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/auth/register", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/auth/google", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/auth/apple", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/auth/logout", StringComparison.OrdinalIgnoreCase);
        // /api/auth/refresh intentionally NOT exempt: Origin must match allowlist when cookies are present.
    }
}
