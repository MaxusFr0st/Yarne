using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly YarneDbContext _context;
    private readonly IAuthService _authService;
    private readonly IAdminActivityLogService _activityLogs;
    private readonly IOAuthService _oauthService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        YarneDbContext context,
        IAuthService authService,
        IAdminActivityLogService activityLogs,
        IOAuthService oauthService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _authService = authService;
        _activityLogs = activityLogs;
        _oauthService = oauthService;
        _logger = logger;
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CustomerProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CustomerProfileResponse>> GetMe(CancellationToken ct)
    {
        var customerId = GetCurrentCustomerId();
        if (customerId == null)
            return Unauthorized();

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == customerId.Value, ct);

        if (customer == null)
            return Unauthorized();

        var fullName = $"{customer.FirstName} {customer.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(fullName))
            fullName = customer.UserName;

        return Ok(new CustomerProfileResponse
        {
            Email = customer.Email,
            FullName = fullName,
            PhoneNumber = customer.PhoneNumber,
        });
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest("Invalid request");

        var result = await _authService.RegisterAsync(request, ct);

        if (result == null)
            return BadRequest(new { message = "Registration could not be completed. Try a different email or sign in." });

        await _activityLogs.LogAsync(
            "user",
            "created",
            $"User account created: {request.Email}",
            request.Email,
            $"{request.FirstName} {request.LastName}".Trim(),
            new
            {
                request.Email,
                request.UserName,
                request.FirstName,
                request.LastName,
            },
            null,
            request.Email,
            ct);

        return Ok(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest("Invalid request");

        try
        {
            var result = await _authService.LoginAsync(request, ct);

            if (result == null)
                return Unauthorized(new { message = "Invalid email or password" });

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email/password login failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Sign-in failed on the server. Please try again." });
        }
    }

    [HttpPost("google")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] OAuthRequest request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest("Invalid request");

        try
        {
            var result = await _oauthService.HandleGoogleAsync(request.IdToken, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google OAuth sign-in failed.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Google sign-in failed on the server. Try again or use email/password." });
        }
    }

    [HttpPost("apple")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthResponse>> AppleLogin([FromBody] OAuthRequest request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest("Invalid request");

        try
        {
            var result = await _oauthService.HandleAppleAsync(request.IdToken, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    private int? GetCurrentCustomerId()
    {
        var customerIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Sid)
            ?? User.FindFirstValue("sub");

        return int.TryParse(customerIdRaw, out var customerId) ? customerId : null;
    }
}
