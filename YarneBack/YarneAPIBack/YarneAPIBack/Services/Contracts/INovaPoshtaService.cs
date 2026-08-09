namespace YarneAPIBack.Services.Contracts;

public record NovaPoshtaWaybill(string TtnNumber, string TtnRef);

public record NovaPoshtaTrackingStatus(string Status, string StatusCode);

public record NovaPoshtaSender(
    string FirstName,
    string LastName,
    string? MiddleName,
    string Phone,
    string CityRef,
    string WarehouseRef);

public interface INovaPoshtaService
{
    bool IsConfigured { get; }

    /// <summary>The configured default sender (identity + ship-from address), or null if unset.</summary>
    NovaPoshtaSender? DefaultSender { get; }

    Task<NovaPoshtaWaybill> CreateWaybillAsync(
        NovaPoshtaSender sender,
        string recipientFirstName,
        string recipientLastName,
        string recipientPhone,
        string cityRef,
        string warehouseRef,
        decimal declaredCost,
        CancellationToken ct = default);

    Task<NovaPoshtaTrackingStatus?> GetTrackingStatusAsync(string ttnNumber, CancellationToken ct = default);
}
