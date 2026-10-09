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
