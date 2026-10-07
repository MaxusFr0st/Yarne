using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Services;

/// <summary>
/// Moves guest orders (CustomerId null, GuestEmail set) onto a customer account, but only when there is
/// proof the person owns that email: they came from the order's status link and the email matches, or
/// the email was verified by Google or Apple. A plain email-and-password registration proves nothing
/// (the project has no email verification), so on its own it never attaches anything.
/// </summary>
public static class GuestOrderAttachment
{
    /// <summary>The guest order the token opens, when it was placed with this email (any letter case); otherwise null.</summary>
    public static async Task<Order?> FindGuestOrderAsync(YarneDbContext db, string? statusToken, string? email, CancellationToken ct = default)
    {
        if (!OrderPublicIdentifiers.LooksLikeStatusToken(statusToken) || string.IsNullOrWhiteSpace(email))
            return null;

        var lowered = email.Trim().ToLower();
        return await db.Orders.AsNoTracking().FirstOrDefaultAsync(
            o => o.StatusToken == statusToken
                && o.CustomerId == null
                && o.GuestEmail != null
                && o.GuestEmail.ToLower() == lowered,
            ct);
    }

    /// <summary>
    /// Attaches every guest order placed with the customer's email, when <paramref name="statusToken"/> opens one
    /// of those orders. Returns how many orders were attached (0 for a missing, unknown or non-matching token).
    /// </summary>
    public static async Task<int> AttachWithStatusTokenAsync(
        YarneDbContext db,
        Customer customer,
        string? statusToken,
        CancellationToken ct = default)
    {
        if (!OrderPublicIdentifiers.LooksLikeStatusToken(statusToken) || string.IsNullOrWhiteSpace(customer.Email))
            return 0;

        var email = customer.Email.Trim().ToLower();
        var tokenOpensAMatchingGuestOrder = await db.Orders.AnyAsync(
            o => o.StatusToken == statusToken
                && o.CustomerId == null
                && o.GuestEmail != null
                && o.GuestEmail.ToLower() == email,
            ct);

        return tokenOpensAMatchingGuestOrder ? await AttachAllByEmailAsync(db, customer, ct: ct) : 0;
    }

    /// <summary>
    /// Attaches every guest order placed with the customer's email. Call it only when that email is proven
    /// (a verified Google or Apple sign-in, or the status-link check above).
    /// </summary>
    public static async Task<int> AttachAllByEmailAsync(
        YarneDbContext db,
        Customer customer,
        string? provenEmail = null,
        CancellationToken ct = default)
    {
        var address = string.IsNullOrWhiteSpace(provenEmail) ? customer.Email : provenEmail;
        if (string.IsNullOrWhiteSpace(address))
            return 0;

        var email = address.Trim().ToLower();
        var orders = await db.Orders
            .Where(o => o.CustomerId == null && o.GuestEmail != null && o.GuestEmail.ToLower() == email)
            .ToListAsync(ct);
        if (orders.Count == 0)
            return 0;

        var now = DateTime.UtcNow;
        foreach (var order in orders)
        {
            order.CustomerId = customer.Id;
            order.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return orders.Count;
    }
}
