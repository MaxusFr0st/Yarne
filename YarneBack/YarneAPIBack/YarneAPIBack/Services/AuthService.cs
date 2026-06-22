using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class AuthService : IAuthService
{
    private static readonly JwtSecurityTokenHandler TokenHandler = new();

    private readonly YarneDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public AuthService(YarneDbContext context, IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var emailTaken = await _context.Customers.AnyAsync(c => c.Email == request.Email, ct);
        if (emailTaken)
            return null;

        var usernameTaken = await _context.Customers.AnyAsync(c => c.UserName == request.UserName, ct);
        if (usernameTaken)
            return null;

        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        var customer = new Models.Customer
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            UserName = request.UserName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = hash,
            PasswordSalt = hash,
            IsActive = true,
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync(ct);

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer", ct);
        if (role != null)
        {
            _context.CustomerRoles.Add(new Models.CustomerRole
            {
                CustomerId = customer.Id,
                RoleId = role.Id,
            });
            await _context.SaveChangesAsync(ct);
        }

        return await GenerateTokenAsync(customer, ct);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email == request.Email && c.IsActive, ct);

        if (customer == null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, customer.PasswordHash))
            return null;

        return await GenerateTokenAsync(customer, ct);
    }

    private async Task<AuthResponse> GenerateTokenAsync(Models.Customer customer, CancellationToken ct = default)
    {
        var roles = await _context.CustomerRoles
            .Where(cr => cr.CustomerId == customer.Id)
            .Select(cr => cr.Role.Name)
            .ToListAsync(ct);

        var roleName = roles.Contains("Admin") ? "Admin"
            : roles.Count > 0 ? roles[0]
            : "Customer";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.Add(_jwtSettings.GetExpirationForRole(roleName));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, customer.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, customer.Email),
            new Claim(JwtRegisteredClaimNames.UniqueName, customer.UserName),
            new Claim(ClaimTypes.NameIdentifier, customer.Id.ToString()),
            new Claim(ClaimTypes.Role, roleName),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return new AuthResponse
        {
            Token = TokenHandler.WriteToken(token),
            Email = customer.Email,
            UserName = customer.UserName,
            FullName = $"{customer.FirstName} {customer.LastName}",
            Role = roleName,
            ExpiresAt = expires,
        };
    }
}
