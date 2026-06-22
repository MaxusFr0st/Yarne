using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class OAuthService : IOAuthService
{
    private readonly YarneDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly SemaphoreSlim _appleKeysCacheLock = new(1, 1);
    private static IList<JsonWebKey>? _cachedAppleKeys;
    private static DateTime _appleKeysCachedAt = DateTime.MinValue;

    public OAuthService(
        YarneDbContext context,
        IOptions<JwtSettings> jwtSettings,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthResponse> HandleGoogleAsync(string accessToken, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient();
        HttpResponseMessage response;
        try
        {
            response = await client.GetAsync(
                $"https://www.googleapis.com/oauth2/v3/userinfo?access_token={Uri.EscapeDataString(accessToken)}", ct);
        }
        catch (Exception ex)
        {
            throw new UnauthorizedAccessException("Could not reach Google to validate token.", ex);
        }

        if (!response.IsSuccessStatusCode)
            throw new UnauthorizedAccessException("Invalid or expired Google access token.");

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;

        var email = root.TryGetProperty("email", out var emailEl) ? emailEl.GetString() : null;
        if (string.IsNullOrEmpty(email))
            throw new UnauthorizedAccessException("Google token does not contain an email claim.");

        var sub = root.TryGetProperty("sub", out var subEl) ? subEl.GetString() ?? "" : "";
        var givenName = root.TryGetProperty("given_name", out var gnEl) ? gnEl.GetString() ?? "" : "";
        var familyName = root.TryGetProperty("family_name", out var fnEl) ? fnEl.GetString() ?? "" : "";

        return await FindOrCreateCustomerAsync(email, "google", sub, givenName, familyName, ct);
    }

    public async Task<AuthResponse> HandleAppleAsync(string idToken, CancellationToken ct = default)
    {
        var appleServiceId = _configuration["OAuth:Apple:ServiceId"]
            ?? throw new InvalidOperationException("OAuth:Apple:ServiceId is not configured.");

        var keys = await GetApplePublicKeysAsync(ct);

        var handler = new JwtSecurityTokenHandler();
        JwtSecurityToken? validatedToken = null;

        var validationParams = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://appleid.apple.com",
            ValidateAudience = true,
            ValidAudience = appleServiceId,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = keys,
            ClockSkew = TimeSpan.FromMinutes(5),
        };

        try
        {
            handler.ValidateToken(idToken, validationParams, out var rawToken);
            validatedToken = rawToken as JwtSecurityToken;
        }
        catch (Exception ex)
        {
            throw new UnauthorizedAccessException("Invalid Apple ID token.", ex);
        }

        if (validatedToken == null)
            throw new UnauthorizedAccessException("Invalid Apple ID token — could not validate with any Apple public key.");

        var subject = validatedToken.Subject
            ?? throw new UnauthorizedAccessException("Apple token does not contain a sub claim.");

        var email = validatedToken.Claims
            .FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value
            ?? validatedToken.Claims
            .FirstOrDefault(c => c.Type == "email")?.Value
            ?? throw new UnauthorizedAccessException("Apple token does not contain an email claim.");

        return await FindOrCreateCustomerAsync(email, "apple", subject, "", "", ct);
    }

    private async Task<IList<JsonWebKey>> GetApplePublicKeysAsync(CancellationToken ct)
    {
        // Cache Apple's JWKS for 1 hour to avoid spamming their endpoint
        if (_cachedAppleKeys != null && DateTime.UtcNow - _appleKeysCachedAt < TimeSpan.FromHours(1))
            return _cachedAppleKeys;

        await _appleKeysCacheLock.WaitAsync(ct);
        try
        {
            if (_cachedAppleKeys != null && DateTime.UtcNow - _appleKeysCachedAt < TimeSpan.FromHours(1))
                return _cachedAppleKeys;

            var client = _httpClientFactory.CreateClient();
            var json = await client.GetStringAsync("https://appleid.apple.com/auth/keys", ct);

            var jwkSet = new JsonWebKeySet(json);
            _cachedAppleKeys = jwkSet.Keys;
            _appleKeysCachedAt = DateTime.UtcNow;
            return _cachedAppleKeys;
        }
        finally
        {
            _appleKeysCacheLock.Release();
        }
    }

    private async Task<AuthResponse> FindOrCreateCustomerAsync(
        string email,
        string provider,
        string providerId,
        string firstName,
        string lastName,
        CancellationToken ct)
    {
        // Find by email first (account linking), then by provider+providerId
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email == email, ct)
            ?? await _context.Customers
            .FirstOrDefaultAsync(c => c.OAuthProvider == provider && c.OAuthProviderId == providerId, ct);

        if (customer == null)
        {
            // Auto-create new customer
            var baseUserName = email.Split('@')[0];
            var userName = await EnsureUniqueUserNameAsync(baseUserName, ct);

            customer = new Customer
            {
                FirstName = string.IsNullOrWhiteSpace(firstName) ? userName : firstName,
                LastName = string.IsNullOrWhiteSpace(lastName) ? "" : lastName,
                UserName = userName,
                Email = email,
                PasswordHash = "",
                PasswordSalt = "",
                IsActive = true,
                OAuthProvider = provider,
                OAuthProviderId = providerId,
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync(ct);

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer", ct);
            if (role != null)
            {
                _context.CustomerRoles.Add(new CustomerRole
                {
                    CustomerId = customer.Id,
                    RoleId = role.Id,
                });
                await _context.SaveChangesAsync(ct);
            }
        }
        else if (customer.OAuthProvider == null)
        {
            // Link existing password account to OAuth provider
            customer.OAuthProvider = provider;
            customer.OAuthProviderId = providerId;
            await _context.SaveChangesAsync(ct);
        }

        return await GenerateTokenAsync(customer, ct);
    }

    private async Task<string> EnsureUniqueUserNameAsync(string baseUserName, CancellationToken ct)
    {
        var sanitized = new string(baseUserName.Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-').ToArray());
        if (string.IsNullOrEmpty(sanitized))
            sanitized = "user";

        var candidate = sanitized;
        var suffix = 1;

        while (await _context.Customers.AnyAsync(c => c.UserName == candidate, ct))
        {
            candidate = $"{sanitized}{suffix++}";
        }

        return candidate;
    }

    private async Task<AuthResponse> GenerateTokenAsync(Customer customer, CancellationToken ct)
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
        };
    }
}
