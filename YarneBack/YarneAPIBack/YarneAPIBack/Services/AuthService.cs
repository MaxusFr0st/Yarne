using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public class AuthService : IAuthService
{
    private readonly YarneDbContext _context;
    private readonly IAccessTokenIssuer _accessTokens;
    private readonly IRefreshTokenService _refreshTokens;

    public AuthService(
        YarneDbContext context,
        IAccessTokenIssuer accessTokens,
        IRefreshTokenService refreshTokens)
    {
        _context = context;
        _accessTokens = accessTokens;
        _refreshTokens = refreshTokens;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (await _context.Customers.AnyAsync(c => c.Email == request.Email, ct))
            return null;

        if (await _context.Customers.AnyAsync(c => c.UserName == request.UserName, ct))
            return null;

        var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt);

        var customer = new Models.Customer
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            UserName = request.UserName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = hash,
            PasswordSalt = salt,
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

        return await IssueSessionAsync(customer, ct);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email == request.Email && c.IsActive, ct);

        if (customer == null)
            return null;

        if (!HasPasswordLogin(customer))
        {
            throw new UnauthorizedAccessException(
                "This account uses Google or Apple sign-in. Please use that button instead of email and password.");
        }

        try
        {
            if (!BCrypt.Net.BCrypt.Verify(request.Password, customer.PasswordHash))
                return null;
        }
        catch (Exception)
        {
            return null;
        }

        return await IssueSessionAsync(customer, ct);
    }

    private async Task<AuthResponse> IssueSessionAsync(Models.Customer customer, CancellationToken ct)
    {
        var access = await _accessTokens.IssueAsync(customer, ct);
        await _refreshTokens.AttachNewRefreshAsync(access, ct);
        return access;
    }

    private static bool HasPasswordLogin(Models.Customer customer) =>
        !string.IsNullOrWhiteSpace(customer.PasswordHash)
        && customer.PasswordHash.StartsWith("$2", StringComparison.Ordinal);
}
