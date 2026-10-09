using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using YarneAPIBack.Configuration;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

public class PasswordResetTests : IDisposable
{
    private const string OldPassword = "OldPass1word";
    private const string NewPassword = "BrandNew2pass";

    private readonly YarneDbContext _db;
    private readonly MailBox _mail = new();
    private readonly LogBox _logs = new();
    private readonly PasswordResetService _service;

    public PasswordResetTests()
    {
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new YarneDbContext(options);
        _db.Customers.Add(NewCustomer(1, "anna@example.com", withPassword: true));
        _db.Customers.Add(NewCustomer(2, "google@example.com", withPassword: false));
        _db.SaveChanges();
        _service = NewService(_db);
    }

    public void Dispose() => _db.Dispose();

    private PasswordResetService NewService(YarneDbContext db)
    {
        var jwt = Options.Create(new JwtSettings { Secret = "a-test-secret-that-is-long-enough-for-hmac-sha256" });
        var access = new AccessTokenIssuer(db, jwt);
        var refresh = new RefreshTokenService(db, jwt, access, NullLogger<RefreshTokenService>.Instance);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["FRONTEND_BASE_URL"] = "https://shop.test" }).Build();
        return new PasswordResetService(db, _mail, config, access, refresh, _logs.Logger<PasswordResetService>())
        {
            MinimumDuration = TimeSpan.Zero,
        };
    }

    private static Customer NewCustomer(int id, string email, bool withPassword)
    {
        var salt = BCrypt.Net.BCrypt.GenerateSalt(4);
        return new Customer
        {
            Id = id,
            FirstName = "Anna",
            LastName = "Koval",
            UserName = email.Split('@')[0],
            Email = email,
            PasswordSalt = withPassword ? salt : "",
            PasswordHash = withPassword ? BCrypt.Net.BCrypt.HashPassword(OldPassword, salt) : "",
            OAuthProvider = withPassword ? null : "google",
            OAuthProviderId = withPassword ? null : "g-" + id,
            IsActive = true,
        };
    }

    private async Task AskAsync(string email, string? locale = null)
    {
        await _service.RequestAsync(email, locale);
        await _service.EmailDispatched;
    }

    private string TokenFrom(PasswordResetEmailMessage message)
    {
        var url = new Uri(message.ResetUrl);
        Assert.Equal("shop.test", url.Host);
        return Assert.Single(System.Web.HttpUtility.ParseQueryString(url.Query).GetValues("token")!);
    }

    [Fact]
    public async Task UnknownEmail_SendsNothingAndStoresNothing()
    {
        await AskAsync("nobody@example.com");

        Assert.Empty(_mail.Sent);
        Assert.Empty(_db.PasswordResetTokens);
    }

    [Fact]
    public async Task InactiveAccount_SendsNothing()
    {
        var customer = await _db.Customers.SingleAsync(c => c.Id == 1);
        customer.IsActive = false;
        await _db.SaveChangesAsync();

        await AskAsync("anna@example.com");

        Assert.Empty(_mail.Sent);
        Assert.Empty(_db.PasswordResetTokens);
    }

    [Fact]
    public async Task KnownEmail_SendsOneLink_AndStoresOnlyTheHash()
    {
        await AskAsync("Anna@Example.com", "en");

        var message = Assert.Single(_mail.Sent);
        Assert.Equal("anna@example.com", message.ToEmail);
        Assert.Equal("en", message.Locale);
        Assert.StartsWith("https://shop.test/en/reset-password?token=", message.ResetUrl);
        var raw = TokenFrom(message);
        Assert.True(raw.Length >= 40);

        var stored = await _db.PasswordResetTokens.AsNoTracking().SingleAsync();
        Assert.Equal(PasswordResetService.HashToken(raw), stored.TokenHash);
        Assert.DoesNotContain(raw, stored.TokenHash);
        Assert.Null(stored.UsedAt);
        Assert.InRange((stored.ExpiresAt - stored.CreatedAt).TotalMinutes, 29.9, 30.1);
    }

    [Fact]
    public async Task FourthRequestInAnHour_StillSucceedsButSendsNothingNew()
    {
        for (var i = 0; i < 4; i++)
            await AskAsync("anna@example.com");

        Assert.Equal(PasswordResetService.MaxEmailsPerHour, _mail.Sent.Count);
        Assert.Equal(PasswordResetService.MaxEmailsPerHour, await _db.PasswordResetTokens.CountAsync());
    }

    [Fact]
    public async Task NewRequest_LeavesTheEarlierLinkWorking_AndUsingOneKillsTheOther()
    {
        await AskAsync("anna@example.com");
        await AskAsync("anna@example.com");

        var first = TokenFrom(_mail.Sent[0]);
        var second = TokenFrom(_mail.Sent[1]);

        // Someone else asking again must not cancel the owner's link.
        Assert.NotNull(await _service.ResetAsync(first, NewPassword));
        Assert.Null(await _service.ResetAsync(second, NewPassword));
    }

    [Fact]
    public async Task GoogleAccount_GetsTheGoogleEmail_AndNoToken()
    {
        await AskAsync("google@example.com", "uk");

        var message = Assert.Single(_mail.Sent);
        Assert.Equal("Google", message.OAuthProvider);
        Assert.Equal(string.Empty, message.ResetUrl);
        Assert.Equal("https://shop.test/uk", message.SiteUrl);
        Assert.Empty(_db.PasswordResetTokens);

        var html = PasswordResetEmailBuilder.BuildHtml(message);
        Assert.Contains("Ваш акаунт використовує вхід через Google", html);
        Assert.Contains(System.Net.WebUtility.HtmlEncode("«Увійти через Google»"), html);
        Assert.DoesNotContain("reset-password", html);
    }

    [Fact]
    public async Task Reset_WithAValidToken_ChangesThePassword_SignsIn_AndRevokesOtherSessions()
    {
        _db.RefreshTokens.Add(new RefreshToken { CustomerId = 1, TokenHash = "other-device", ExpiresAtUtc = DateTime.UtcNow.AddDays(5), CreatedAtUtc = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());

        var result = await _service.ResetAsync(raw, NewPassword);

        Assert.NotNull(result);
        Assert.Equal("anna@example.com", result!.Email);
        Assert.False(string.IsNullOrEmpty(result.Token));
        Assert.False(string.IsNullOrEmpty(result.RefreshToken));

        var customer = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.True(BCrypt.Net.BCrypt.Verify(NewPassword, customer.PasswordHash));
        Assert.False(BCrypt.Net.BCrypt.Verify(OldPassword, customer.PasswordHash));

        var other = await _db.RefreshTokens.AsNoTracking().SingleAsync(t => t.TokenHash == "other-device");
        Assert.NotNull(other.RevokedAtUtc);
        // Only the session just issued is still open.
        Assert.Single(await _db.RefreshTokens.Where(t => t.RevokedAtUtc == null).ToListAsync());
    }

    [Fact]
    public async Task Reset_CannotBeUsedTwice()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());

        Assert.NotNull(await _service.ResetAsync(raw, NewPassword));
        Assert.Null(await _service.ResetAsync(raw, "Another3password"));

        var customer = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.True(BCrypt.Net.BCrypt.Verify(NewPassword, customer.PasswordHash));
    }

    [Fact]
    public async Task Reset_WithAnExpiredToken_IsRefused()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());
        var row = await _db.PasswordResetTokens.SingleAsync();
        row.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await _db.SaveChangesAsync();

        Assert.Null(await _service.ResetAsync(raw, NewPassword));

        var customer = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.True(BCrypt.Net.BCrypt.Verify(OldPassword, customer.PasswordHash));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-real-token")]
    public async Task Reset_WithAnUnknownToken_IsRefused(string? token)
    {
        Assert.Null(await _service.ResetAsync(token, NewPassword));
    }

    [Fact]
    public async Task OnlyStaleLinksAreCleanedUp()
    {
        var now = DateTime.UtcNow;
        _db.PasswordResetTokens.AddRange(
            new PasswordResetToken { CustomerId = 1, TokenHash = "a", CreatedAt = now.AddDays(-3), ExpiresAt = now.AddDays(-3).AddMinutes(30) },
            new PasswordResetToken { CustomerId = 1, TokenHash = "b", CreatedAt = now.AddDays(-3), ExpiresAt = now.AddDays(-3).AddMinutes(30), UsedAt = now.AddDays(-3) },
            new PasswordResetToken { CustomerId = 1, TokenHash = "c", CreatedAt = now.AddMinutes(-5), ExpiresAt = now.AddMinutes(25) },
            new PasswordResetToken { CustomerId = 1, TokenHash = "d", CreatedAt = now.AddHours(-2), ExpiresAt = now.AddHours(-2).AddMinutes(30), UsedAt = now.AddHours(-2) });
        await _db.SaveChangesAsync();

        var removed = await PasswordResetService.DeleteStaleAsync(_db, now, default);

        Assert.Equal(2, removed);
        Assert.Equal(["c", "d"], (await _db.PasswordResetTokens.Select(t => t.TokenHash).ToListAsync()).Order());
    }

    [Fact]
    public async Task NeitherTheTokenNorThePassword_AppearInTheDatabaseOrTheLogs()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());
        await _service.ResetAsync(raw, NewPassword);

        foreach (var row in await _db.PasswordResetTokens.AsNoTracking().ToListAsync())
        {
            Assert.DoesNotContain(raw, row.TokenHash);
            Assert.NotEqual(raw, row.TokenHash);
        }
        var customer = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.DoesNotContain(NewPassword, customer.PasswordHash + customer.PasswordSalt);
        Assert.DoesNotContain(_logs.Lines, line => line.Contains(raw) || line.Contains(NewPassword) || line.Contains(OldPassword));
    }

    [Fact]
    public async Task AnUnknownAndAKnownEmail_TakeAboutTheSameTime()
    {
        _service.MinimumDuration = TimeSpan.FromMilliseconds(200);

        var unknown = System.Diagnostics.Stopwatch.StartNew();
        await _service.RequestAsync("nobody@example.com", "uk");
        unknown.Stop();
        var known = System.Diagnostics.Stopwatch.StartNew();
        await _service.RequestAsync("anna@example.com", "uk");
        known.Stop();

        Assert.True(unknown.ElapsedMilliseconds >= 190, $"unknown took {unknown.ElapsedMilliseconds} ms");
        Assert.True(known.ElapsedMilliseconds >= 190, $"known took {known.ElapsedMilliseconds} ms");
    }

    // ---- the two endpoints -------------------------------------------------------------

    private AuthController NewController() => new(_db, null!, null!, null!, null!, NullLogger<AuthController>.Instance)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
    };

    [Fact]
    public async Task ForgotPassword_AnswersTheSameBodyForKnownAndUnknownEmails()
    {
        var known = Assert.IsType<OkObjectResult>(await NewController().ForgotPassword(new ForgotPasswordRequest { Email = "anna@example.com" }, _service, default));
        var unknown = Assert.IsType<OkObjectResult>(await NewController().ForgotPassword(new ForgotPasswordRequest { Email = "nobody@example.com" }, _service, default));
        var empty = Assert.IsType<OkObjectResult>(await NewController().ForgotPassword(new ForgotPasswordRequest(), _service, default));

        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(known.Value), System.Text.Json.JsonSerializer.Serialize(unknown.Value));
        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(known.Value), System.Text.Json.JsonSerializer.Serialize(empty.Value));
    }

    [Fact]
    public async Task ResetPassword_WithAWeakPassword_Is400_AndKeepsTheLinkUsable()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());

        foreach (var weak in new[] { "short1A", "alllowercase1", "NoDigitsHere", "", null })
        {
            var result = await NewController().ResetPassword(new ResetPasswordRequest { Token = raw, NewPassword = weak }, _service, default);
            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        Assert.Null((await _db.PasswordResetTokens.AsNoTracking().SingleAsync()).UsedAt);
        Assert.NotNull(await _service.ResetAsync(raw, NewPassword));
    }

    [Fact]
    public async Task ResetPassword_WithABadLink_Is400WithOneGenericAnswer()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());
        await _service.ResetAsync(raw, NewPassword);

        var used = Assert.IsType<BadRequestObjectResult>((await NewController().ResetPassword(new ResetPasswordRequest { Token = raw, NewPassword = "Fresh3passwd" }, _service, default)).Result);
        var unknown = Assert.IsType<BadRequestObjectResult>((await NewController().ResetPassword(new ResetPasswordRequest { Token = "nope", NewPassword = "Fresh3passwd" }, _service, default)).Result);

        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(used.Value), System.Text.Json.JsonSerializer.Serialize(unknown.Value));
    }

    [Fact]
    public async Task ResetPassword_Success_SetsTheSessionCookies_LikeLogin()
    {
        await AskAsync("anna@example.com");
        var raw = TokenFrom(_mail.Sent.Single());
        var controller = NewController();

        var result = await controller.ResetPassword(new ResetPasswordRequest { Token = raw, NewPassword = NewPassword }, _service, default);

        var body = Assert.IsType<AuthResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("anna@example.com", body.Email);
        var cookies = controller.Response.Headers.SetCookie.ToString();
        Assert.Contains("yarne_access=", cookies);
        Assert.Contains("yarne_refresh=", cookies);
    }

    [Fact]
    public void TheNewEndpointsAndOrderCreation_AreRateLimited()
    {
        static string? Policy(Type controller, string action) =>
            controller.GetMethod(action)!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName;

        Assert.Equal("auth-forgot", Policy(typeof(AuthController), nameof(AuthController.ForgotPassword)));
        Assert.Equal("auth-reset", Policy(typeof(AuthController), nameof(AuthController.ResetPassword)));
        Assert.Equal("order-create", Policy(typeof(OrdersController), nameof(OrdersController.CreateOrder)));
    }

    [Fact]
    public void ThePasswordRule_IsTheSameAsRegistrations()
    {
        var attribute = typeof(RegisterRequest).GetProperty(nameof(RegisterRequest.Password))!
            .GetCustomAttribute<System.ComponentModel.DataAnnotations.RegularExpressionAttribute>()!;
        Assert.Equal(PasswordRules.Pattern, attribute.Pattern);
        Assert.True(PasswordRules.IsValid("Abcdefg1"));
        Assert.False(PasswordRules.IsValid("abcdefg1"));
        Assert.False(PasswordRules.IsValid("Abcdefgh"));
        Assert.False(PasswordRules.IsValid("Abc1"));
    }

    [Fact]
    public void TheEmailsAreInTheAskedLanguage()
    {
        var uk = new PasswordResetEmailMessage { ToEmail = "a@b.c", Locale = "uk", ResetUrl = "https://shop.test/uk/reset-password?token=x" };
        var en = new PasswordResetEmailMessage { ToEmail = "a@b.c", Locale = "en", ResetUrl = "https://shop.test/en/reset-password?token=x" };

        Assert.Equal("Yarné · Новий пароль для вашого акаунта", PasswordResetEmailBuilder.BuildSubject(uk));
        Assert.Equal("Yarné · New password for your account", PasswordResetEmailBuilder.BuildSubject(en));
        var ukHtml = PasswordResetEmailBuilder.BuildHtml(uk);
        Assert.Contains("Створіть новий пароль", ukHtml);
        Assert.Contains("Посилання діє 30 хвилин і працює один раз.", ukHtml);
        Assert.Contains("Створити новий пароль", ukHtml);
        Assert.Contains("https://shop.test/uk/reset-password?token=x", ukHtml);
        Assert.Contains("Create a new password", PasswordResetEmailBuilder.BuildHtml(en));
    }

    private sealed class MailBox : IEmailService
    {
        public List<PasswordResetEmailMessage> Sent { get; } = [];
        public Task SendOrderConfirmationAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendOrderReceiptAsync(OrderConfirmationEmailMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendPasswordResetAsync(PasswordResetEmailMessage message, CancellationToken ct = default) { lock (Sent) Sent.Add(message); return Task.CompletedTask; }
    }

    private sealed class LogBox
    {
        public List<string> Lines { get; } = [];
        public ILogger<T> Logger<T>() => new Capture<T>(Lines);

        private sealed class Capture<T>(List<string> lines) : ILogger<T>
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel logLevel) => true;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                lock (lines) lines.Add(formatter(state, exception) + exception);
            }
        }
    }
}
