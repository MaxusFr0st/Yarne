using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Tests;

public class AdminBootstrapTests : IDisposable
{
    private const string ValidToken = "super-secret-bootstrap-token-abc123xyz";
    private static readonly AdminBootstrapRequest ValidRequest = new()
    {
        Email = "admin@example.com",
        Password = "StrongPass123!",
    };

    private readonly YarneDbContext _db;
    private readonly AdminBootstrapController _controller;

    public AdminBootstrapTests()
    {
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new YarneDbContext(options);
        _controller = new AdminBootstrapController(_db, NullLogger<AdminBootstrapController>.Instance);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                Connection = { RemoteIpAddress = IPAddress.Loopback },
            },
        };

        Environment.SetEnvironmentVariable("ADMIN_BOOTSTRAP_TOKEN", ValidToken);
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("ADMIN_BOOTSTRAP_TOKEN", null);
        _db.Dispose();
    }

    [Fact]
    public async Task Bootstrap_CreatesAdminUser_WhenNoAdminExists()
    {
        var result = await _controller.Bootstrap(ValidToken, ValidRequest, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var admin = await _db.Customers.FirstOrDefaultAsync(c => c.Email == ValidRequest.Email);
        Assert.NotNull(admin);

        var adminRole = await _db.Roles.FirstAsync(r => r.Name == "Admin");
        var hasRole = await _db.CustomerRoles.AnyAsync(cr => cr.CustomerId == admin.Id && cr.RoleId == adminRole.Id);
        Assert.True(hasRole);
    }

    [Fact]
    public async Task Bootstrap_Returns403_WhenAdminAlreadyExists()
    {
        // First bootstrap succeeds
        await _controller.Bootstrap(ValidToken, ValidRequest, CancellationToken.None);

        // Second call must be rejected
        var result = await _controller.Bootstrap(ValidToken, new AdminBootstrapRequest
        {
            Email = "other@example.com",
            Password = "AnotherPass456!",
        }, CancellationToken.None);

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);
    }

    [Fact]
    public async Task Bootstrap_Returns401_WhenTokenIsWrong()
    {
        var result = await _controller.Bootstrap("wrong-token", ValidRequest, CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Bootstrap_Returns401_WhenTokenIsMissing()
    {
        var result = await _controller.Bootstrap(null, ValidRequest, CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Bootstrap_Returns503_WhenEnvTokenNotConfigured()
    {
        Environment.SetEnvironmentVariable("ADMIN_BOOTSTRAP_TOKEN", null);

        var result = await _controller.Bootstrap(ValidToken, ValidRequest, CancellationToken.None);

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objResult.StatusCode);
    }

    [Fact]
    public async Task Bootstrap_Returns503_WhenEnvTokenTooShort()
    {
        Environment.SetEnvironmentVariable("ADMIN_BOOTSTRAP_TOKEN", "short");

        var result = await _controller.Bootstrap("short", ValidRequest, CancellationToken.None);

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objResult.StatusCode);
    }

    [Fact]
    public async Task Bootstrap_PromotesExistingUser_WhenUserAlreadyRegistered()
    {
        var salt = BCrypt.Net.BCrypt.GenerateSalt(4);
        var existing = new Customer
        {
            FirstName = "Existing",
            LastName = "User",
            UserName = "existinguser",
            Email = ValidRequest.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPass123!", salt),
            PasswordSalt = salt,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Customers.Add(existing);
        await _db.SaveChangesAsync();

        var result = await _controller.Bootstrap(ValidToken, ValidRequest, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);

        // User count should still be 1 (no duplicate)
        var count = await _db.Customers.CountAsync();
        Assert.Equal(1, count);

        var adminRole = await _db.Roles.FirstAsync(r => r.Name == "Admin");
        var hasRole = await _db.CustomerRoles.AnyAsync(cr => cr.CustomerId == existing.Id && cr.RoleId == adminRole.Id);
        Assert.True(hasRole);
    }

    [Fact]
    public async Task Bootstrap_IsIdempotentForRole_WhenCalledOnUserWithNoAdmins()
    {
        // Bootstrap once
        await _controller.Bootstrap(ValidToken, ValidRequest, CancellationToken.None);

        // Only 1 role assignment should exist
        var adminRole = await _db.Roles.FirstAsync(r => r.Name == "Admin");
        var roleCount = await _db.CustomerRoles.CountAsync(cr => cr.RoleId == adminRole.Id);
        Assert.Equal(1, roleCount);
    }
}
