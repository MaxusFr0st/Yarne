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

        var firstName = request.FirstName?.Trim();
        var lastName = request.LastName?.Trim();
        var userName = request.UserName?.Trim();
        if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName) || string.IsNullOrEmpty(userName))
        {
            // Only the status page's own sign-up may leave these out, and only for the email the order was placed with.
            var order = await GuestOrderAttachment.FindGuestOrderAsync(_context, request.StatusToken, request.Email, ct);
            if (order == null)
                return null;

            firstName = string.IsNullOrEmpty(firstName) ? order.RecipientFirstName?.Trim() : firstName;
            lastName = string.IsNullOrEmpty(lastName) ? order.RecipientLastName?.Trim() : lastName;
            userName = string.IsNullOrEmpty(userName) ? await UniqueUserNameFromEmailAsync(request.Email, ct) : userName;
            if (string.IsNullOrEmpty(firstName) || firstName.Length < 2 || string.IsNullOrEmpty(lastName) || lastName.Length < 2)
                return null;
        }

        if (await _context.Customers.AnyAsync(c => c.UserName == userName, ct))
            return null;

        var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt);

        var customer = new Models.Customer
        {
            FirstName = firstName,
            LastName = lastName,
            UserName = userName,
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

        // Only with the order's status link in hand: a plain registration proves nothing about the email.
        await GuestOrderAttachment.AttachWithStatusTokenAsync(_context, customer, request.StatusToken, ct);

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

        await GuestOrderAttachment.AttachWithStatusTokenAsync(_context, customer, request.StatusToken, ct);

        return await IssueSessionAsync(customer, ct);
    }

    private async Task<string> UniqueUserNameFromEmailAsync(string email, CancellationToken ct)
    {
        var local = email.Split('@')[0];
        var sanitized = new string(local.Where(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '.' or '-').ToArray());
        if (sanitized.Length < 3)
            sanitized = "user" + sanitized;

        var candidate = sanitized;
        var suffix = 1;
        while (await _context.Customers.AnyAsync(c => c.UserName == candidate, ct))
            candidate = $"{sanitized}{suffix++}";
        return candidate;
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
