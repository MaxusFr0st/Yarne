using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Controllers;

public sealed class AdminBootstrapRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(12)]
    public string Password { get; set; } = null!;
}

/// <summary>
/// One-time bootstrap endpoint. Creates the first admin user when no admin exists.
/// Requires ADMIN_BOOTSTRAP_TOKEN env var (min 32 chars) and the matching header.
/// Returns 403 once any admin already exists.
/// </summary>
[ApiController]
[Route("api/admin")]
public class AdminBootstrapController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly ILogger<AdminBootstrapController> _logger;

    public AdminBootstrapController(YarneDbContext context, ILogger<AdminBootstrapController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("bootstrap")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Bootstrap(
        [FromHeader(Name = "X-Admin-Bootstrap-Token")] string? bootstrapToken,
        [FromBody] AdminBootstrapRequest request,
        CancellationToken ct)
    {
        var configuredToken = Environment.GetEnvironmentVariable("ADMIN_BOOTSTRAP_TOKEN");

        if (string.IsNullOrWhiteSpace(configuredToken) || configuredToken.Length < 32)
        {
            _logger.LogWarning("Bootstrap endpoint called but ADMIN_BOOTSTRAP_TOKEN is not configured or too short.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Bootstrap is not enabled on this server." });
        }

        if (string.IsNullOrWhiteSpace(bootstrapToken) || !ConstantTimeEquals(bootstrapToken, configuredToken))
        {
            _logger.LogWarning("Bootstrap: invalid token from {IP}.",
                HttpContext.Connection.RemoteIpAddress);
            return Unauthorized(new { message = "Invalid bootstrap token." });
        }

        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin", ct);

        if (adminRole != null)
        {
            var hasAdmin = await _context.CustomerRoles.AnyAsync(cr => cr.RoleId == adminRole.Id, ct);
            if (hasAdmin)
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { message = "Bootstrap already completed." });
        }
        else
        {
            adminRole = new Role { Name = "Admin" };
            _context.Roles.Add(adminRole);
            await _context.SaveChangesAsync(ct);
        }

        var customer = await _context.Customers
            .Include(c => c.CustomerRoles)
            .FirstOrDefaultAsync(c => c.Email == request.Email, ct);

        if (customer == null)
        {
            var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            customer = new Customer
            {
                FirstName = "Admin",
                LastName = "User",
                UserName = request.Email.Split('@')[0],
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt),
                PasswordSalt = salt,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Customers.Add(customer);
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Bootstrap: created new admin user {Email}.", request.Email);
        }
        else
        {
            var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            customer.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt);
            customer.PasswordSalt = salt;
            customer.IsActive = true;
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Bootstrap: promoted existing user {Email} to Admin.", request.Email);
        }

        if (!customer.CustomerRoles.Any(cr => cr.RoleId == adminRole.Id))
        {
            _context.CustomerRoles.Add(new CustomerRole
            {
                CustomerId = customer.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Bootstrap completed: {Email} is now an admin.", request.Email);
        return Ok(new { message = "Bootstrap completed. Admin user is ready.", email = request.Email });
    }

    // Constant-time comparison to prevent timing-based token enumeration
    private static bool ConstantTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var diff = 0;
        for (var i = 0; i < a.Length; i++)
            diff |= a[i] ^ b[i];
        return diff == 0;
    }
}
