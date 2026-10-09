namespace YarneAPIBack.Services;

/// <summary>
/// The Message-ID, In-Reply-To and References of an order's emails, so Gmail and Apple Mail fold them into one conversation: the
/// first email of a thread (the customer's "received", the owner's "new order") carries a stable id derived from the order; every
/// later email replies to it. The customer's and the owner's emails are separate threads.
/// </summary>
public static class EmailThreading
{
    public sealed record Headers(string MessageId, string? InReplyTo, string? References);

    /// <param name="message">The email about to be sent.</param>
    /// <param name="emailFrom">The configured sender; its domain goes into the ids.</param>
    public static Headers For(OrderConfirmationEmailMessage message, string? emailFrom)
    {
        var domain = DomainOf(emailFrom);
        var owner = OrderConfirmationEmailBuilder.IsOwnerEvent(message.Event);
        var root = $"<order-{message.OrderId}-{(owner ? "admin" : "customer")}-root@{domain}>";
        var first = message.Event is OrderEmailEvent.Received or OrderEmailEvent.InternalPlacedNotification;
        return first
            ? new Headers(root, null, null)
            : new Headers($"<order-{message.OrderId}-{(int)message.Event}-{Guid.NewGuid():N}@{domain}>", root, root);
    }

    /// <summary>An email that belongs to no order thread (password reset): a fresh id and no replies.</summary>
    public static Headers Standalone(string kind, string? emailFrom)
        => new($"<{kind}-{Guid.NewGuid():N}@{DomainOf(emailFrom)}>", null, null);

    private static string DomainOf(string? emailFrom)
    {
        var text = emailFrom ?? string.Empty;
        var at = text.LastIndexOf('@');
        if (at < 0)
            return "yarne-acc.com";
        return text[(at + 1)..].Trim().TrimEnd('>', ' ').Trim();
    }
}
