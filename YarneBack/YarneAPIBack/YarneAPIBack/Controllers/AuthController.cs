using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAdminActivityLogService _activityLogs;
    private readonly IOAuthService _oauthService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        IAdminActivityLogService activityLogs,
        IOAuthService oauthService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _activityLogs = activityLogs;
        _oauthService = oauthService;
        _logger = logger;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest("Invalid request");

        var result = await _authService.RegisterAsync(request, ct);

        if (result == null)
            return BadRequest(new { message = "Email or UserName already registered" });

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
}
