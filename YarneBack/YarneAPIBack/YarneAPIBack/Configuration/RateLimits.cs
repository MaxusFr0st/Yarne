using System.Net;
using System.Threading.RateLimiting;

namespace YarneAPIBack.Configuration;

/// <summary>
/// Every request limit in the app counts over a sliding window, not a fixed one. A fixed window
/// forgets everything when the clock turns over, so a full burst at the end of one minute and
/// another at the start of the next both pass: twice the limit in a few seconds. Here the window
/// is cut into slices and the last full window of slices is always counted, so a burst stays
/// counted until it is a whole window old.
/// </summary>
public static class RateLimits
{
    /// <summary>
    /// Whose counter a request falls under. Behind Railway the edge states the visitor's address in
    /// X-Real-IP; X-Forwarded-For arrives as the visitor sent it, so a made-up value there gave
    /// every request a counter of its own and no limit ever applied. If a caller sends its own
    /// X-Real-IP as well, the edge's copy is the last one.
    /// </summary>
    public static string ClientKey(HttpContext context)
    {
        var stated = context.Request.Headers["X-Real-IP"];
        var last = stated.Count > 0 ? stated[^1]?.Split(',')[^1].Trim() : null;
        if (!string.IsNullOrEmpty(last) && IPAddress.TryParse(last, out var address))
            return address.ToString();
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    /// <summary>Slices of about ten seconds for a short window, and never more than ten.</summary>
    public static int SegmentsFor(TimeSpan window) =>
        (int)Math.Clamp(Math.Round(window.TotalSeconds / 10), 2, 10);

    public static SlidingWindowRateLimiterOptions Options(int permitLimit, TimeSpan window) => new()
    {
        PermitLimit = permitLimit,
        Window = window,
        SegmentsPerWindow = SegmentsFor(window),
        QueueLimit = 0,
        AutoReplenishment = true,
    };

    public static RateLimitPartition<string> SlidingWindow(string key, int permitLimit, TimeSpan window) =>
        RateLimitPartition.GetSlidingWindowLimiter(key, _ => Options(permitLimit, window));
}
