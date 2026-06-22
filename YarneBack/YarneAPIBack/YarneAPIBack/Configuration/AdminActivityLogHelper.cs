using System.Security.Claims;

namespace YarneAPIBack.Configuration;

public static class AdminActivityLogHelper
{
    public static (int? UserId, string? Email) GetActor(HttpContext? httpContext)
    {
        if (httpContext?.User?.Identity?.IsAuthenticated != true)
            return (null, null);

        var idRaw = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        int? userId = int.TryParse(idRaw, out var parsed) ? parsed : null;
        var email = httpContext.User.FindFirstValue(ClaimTypes.Email);
        return (userId, email);
    }
}
