using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public sealed class AccessTokenIssuer : IAccessTokenIssuer
{
    private readonly YarneDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public AccessTokenIssuer(YarneDbContext context, IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<AuthResponse> IssueAsync(Customer customer, CancellationToken ct = default)
    {
        var roleName = "Customer";
        var roles = await _context.CustomerRoles
            .Where(cr => cr.CustomerId == customer.Id)
            .Select(cr => cr.Role.Name)
            .ToListAsync(ct);
        if (roles.Contains("Admin"))
            roleName = "Admin";
        else if (roles.Count > 0)
            roleName = roles[0];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.Add(_jwtSettings.GetExpirationForRole(roleName));

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, customer.Id.ToString()),
            new(ClaimTypes.Email, customer.Email),
            new(ClaimTypes.Name, customer.UserName),
            new(ClaimTypes.Role, roleName),
            new(JwtRegisteredClaimNames.Sub, customer.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, customer.Email),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return new AuthResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Email = customer.Email,
            UserName = customer.UserName,
            FullName = $"{customer.FirstName} {customer.LastName}".Trim(),
            Role = roleName,
            ExpiresAt = expires,
            CustomerId = customer.Id,
        };
    }
}
