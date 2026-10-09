using System.Threading.RateLimiting;
using YarneAPIBack.Configuration;

namespace YarneAPIBack.Tests;

/// <summary>
/// The limits must hold across a window boundary: a burst at the end of one window may not be
/// followed by a second full burst at the start of the next.
/// </summary>
public class RateLimitTests
{
    // The app's own options for a one-minute limit (six slices), run on a 1.2-second window so the
    // test can wait through real slices of 200 ms.
    private static readonly TimeSpan Slice = TimeSpan.FromMilliseconds(200);

    private static SlidingWindowRateLimiter Limiter(int limit)
    {
        var options = RateLimits.Options(limit, TimeSpan.FromMinutes(1));
        options.Window = Slice * options.SegmentsPerWindow;
        return new SlidingWindowRateLimiter(options);
    }

    private static int Take(RateLimiter limiter, int attempts)
    {
        var granted = 0;
        for (var i = 0; i < attempts; i++)
        {
            using var lease = limiter.AttemptAcquire();
            if (lease.IsAcquired) granted++;
        }
        return granted;
    }

    [Fact]
    public async Task A_burst_at_the_end_of_a_window_still_counts_at_the_start_of_the_next()
    {
        using var limiter = Limiter(20);

        // Quiet for most of the window, then the whole allowance at once near its end.
        await Task.Delay(Slice * 5);
        Assert.Equal(20, Take(limiter, 20));

        // The first window is over: a fixed window would hand out 20 more here.
        await Task.Delay(Slice * 2);
        Assert.Equal(0, Take(limiter, 20));
    }

    [Fact]
    public async Task The_allowance_comes_back_once_the_burst_is_a_full_window_old()
    {
        using var limiter = Limiter(20);
        Assert.Equal(20, Take(limiter, 25));

        await Task.Delay(Slice * 8);
        Assert.Equal(20, Take(limiter, 25));
    }

    [Theory]
    [InlineData(60, 6)]
    [InlineData(600, 10)]
    [InlineData(10, 2)]
    public void Slices_are_about_ten_seconds_and_at_most_ten(int seconds, int expected)
    {
        Assert.Equal(expected, RateLimits.SegmentsFor(TimeSpan.FromSeconds(seconds)));
    }
}

public class RateLimitClientKeyTests
{
    private static Microsoft.AspNetCore.Http.DefaultHttpContext Request(string? remote, params string[] realIp)
    {
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        if (remote != null) context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(remote);
        if (realIp.Length > 0) context.Request.Headers["X-Real-IP"] = new Microsoft.Extensions.Primitives.StringValues(realIp);
        return context;
    }

    [Fact]
    public void The_edge_stated_address_is_the_key() =>
        Assert.Equal("203.0.113.9", RateLimits.ClientKey(Request("10.0.0.1", "203.0.113.9")));

    [Fact]
    public void A_caller_supplied_copy_does_not_win_over_the_edge_copy() =>
        Assert.Equal("203.0.113.9", RateLimits.ClientKey(Request("10.0.0.1", "198.51.100.1", "203.0.113.9")));

    [Fact]
    public void Without_the_header_or_with_rubbish_in_it_the_connection_address_is_used()
    {
        Assert.Equal("10.0.0.1", RateLimits.ClientKey(Request("10.0.0.1")));
        Assert.Equal("10.0.0.1", RateLimits.ClientKey(Request("10.0.0.1", "not-an-address")));
        Assert.Equal("unknown", RateLimits.ClientKey(Request(null)));
    }
}
