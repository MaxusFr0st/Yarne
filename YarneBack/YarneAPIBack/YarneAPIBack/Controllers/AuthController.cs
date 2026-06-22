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

    public AuthController(IAuthService authService, IAdminActivityLogService activityLogs)
    {
        _authService = authService;
        _activityLogs = activityLogs;
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

        var result = await _authService.LoginAsync(request, ct);

        if (result == null)
            return Unauthorized(new { message = "Invalid email or password" });

        return Ok(result);
    }
}
