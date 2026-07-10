namespace YarneAPIBack.Services;

public sealed class ProductValidationException : InvalidOperationException
{
    public ProductValidationException(string message, IReadOnlyList<string>? invalidSuggestedCodes = null)
        : base(message)
    {
        InvalidSuggestedCodes = invalidSuggestedCodes ?? Array.Empty<string>();
    }

    public IReadOnlyList<string> InvalidSuggestedCodes { get; }
}
