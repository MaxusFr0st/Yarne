namespace YarneAPIBack.Services.Contracts;

public record NovaPoshtaWaybill(string TtnNumber, string TtnRef);

public record NovaPoshtaTrackingStatus(string Status, string StatusCode);

/// <summary>A settlement (city/town/village) in Nova Poshta's delivery network.</summary>
public record NovaPoshtaCity(string Ref, string Name);

/// <summary>A branch/warehouse within one city.</summary>
public record NovaPoshtaWarehouse(string Ref, string CityRef, string Description, string ShortAddress, string Number);

/// <summary>Ship-from address override. Falls back to the sender profile's own default when omitted.</summary>
public record NovaPoshtaSenderAddress(string CityRef, string WarehouseRef);

/// <summary>
/// A registered Nova Poshta sender. Each API key is scoped to exactly one sender identity
/// (Nova Poshta refuses to create a second sender counterparty or edit the existing contact
/// under one account) — so "picking who sends" means picking which account's key to call
/// with, not editing a name/phone field.
/// </summary>
public record NovaPoshtaSenderProfile(
    string Id,
    string Label,
    string ApiKey,
    string SenderRef,
    string ContactRef,
    string Phone,
    string? DefaultCityRef,
    string? DefaultCityName,
    string? DefaultWarehouseRef,
    string? DefaultWarehouseName);

public interface INovaPoshtaService
{
    bool IsConfigured { get; }

    IReadOnlyList<NovaPoshtaSenderProfile> SenderProfiles { get; }

    /// <summary>First configured sender profile — used when there's no admin UI to prompt for a choice.</summary>
    NovaPoshtaSenderProfile? DefaultSenderProfile { get; }

    Task<NovaPoshtaWaybill> CreateWaybillAsync(
        string senderProfileId,
        NovaPoshtaSenderAddress? senderAddressOverride,
        string recipientFirstName,
        string recipientLastName,
        string recipientPhone,
        string cityRef,
        string warehouseRef,
        decimal declaredCost,
        CancellationToken ct = default);

    Task<NovaPoshtaTrackingStatus?> GetTrackingStatusAsync(string ttnNumber, CancellationToken ct = default);

    /// <summary>Estimated shipping cost, in UAH. Uses Nova Poshta's keyless pricing endpoint, so it works pre-checkout with no account/order yet.</summary>
    Task<decimal?> GetShippingPriceAsync(string recipientCityRef, decimal declaredCost, CancellationToken ct = default);

    /// <summary>Every city/settlement in Nova Poshta's network. Keyless endpoint. Cache this — it's a large, slow-changing list, not a per-request call.</summary>
    Task<IReadOnlyList<NovaPoshtaCity>> GetCitiesAsync(CancellationToken ct = default);

    /// <summary>Branches within one city. Keyless endpoint.</summary>
    Task<IReadOnlyList<NovaPoshtaWarehouse>> GetWarehousesAsync(string cityRef, CancellationToken ct = default);

    /// <summary>
    /// Cancels a waybill. Must use the same sender profile that created it -- Nova Poshta
    /// refuses to delete a document from any account other than the one that made it.
    /// </summary>
    Task<bool> DeleteWaybillAsync(string senderProfileId, string ttnRef, CancellationToken ct = default);
}
