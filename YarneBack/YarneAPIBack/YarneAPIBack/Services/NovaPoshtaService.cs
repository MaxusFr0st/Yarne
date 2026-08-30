using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

// ponytail: fixed 1kg declared weight per shipment — Product has no weight field yet.
// Add real per-item weight once it matters for pricing accuracy.
public class NovaPoshtaService : INovaPoshtaService
{
    private const decimal DefaultWeightKg = 1m;
    private static readonly Uri Endpoint = new("https://api.novaposhta.ua/v2.0/json/");

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NovaPoshtaService> _logger;

    public NovaPoshtaService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<NovaPoshtaService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        SenderProfiles = LoadSenderProfiles(configuration);
    }

    private static string? Read(IConfiguration configuration, string key) =>
        configuration[key] ?? Environment.GetEnvironmentVariable(key);

    // Numbered env vars (NOVA_POSHTA_SENDER_1_*, _2_*, ...) — each slot is a fully separate
    // Nova Poshta account/API key, since that's the only way to get more than one sender
    // identity (see NovaPoshtaSenderProfile). Stops at the first missing API key.
    private static List<NovaPoshtaSenderProfile> LoadSenderProfiles(IConfiguration configuration)
    {
        var profiles = new List<NovaPoshtaSenderProfile>();
        for (var i = 1; ; i++)
        {
            var prefix = $"NOVA_POSHTA_SENDER_{i}_";
            var apiKey = Read(configuration, $"{prefix}API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
                break;

            var senderRef = Read(configuration, $"{prefix}REF");
            var contactRef = Read(configuration, $"{prefix}CONTACT_REF");
            var phone = Read(configuration, $"{prefix}PHONE");
            if (string.IsNullOrWhiteSpace(senderRef) || string.IsNullOrWhiteSpace(contactRef) || string.IsNullOrWhiteSpace(phone))
                continue;

            profiles.Add(new NovaPoshtaSenderProfile(
                Id: $"sender-{i}",
                Label: Read(configuration, $"{prefix}LABEL") ?? $"Sender {i}",
                ApiKey: apiKey,
                SenderRef: senderRef,
                ContactRef: contactRef,
                Phone: phone,
                DefaultCityRef: Read(configuration, $"{prefix}CITY_REF"),
                DefaultCityName: Read(configuration, $"{prefix}CITY_NAME"),
                DefaultWarehouseRef: Read(configuration, $"{prefix}WAREHOUSE_REF"),
                DefaultWarehouseName: Read(configuration, $"{prefix}WAREHOUSE_NAME")));
        }
        return profiles;
    }

    public bool IsConfigured => SenderProfiles.Count > 0;

    public IReadOnlyList<NovaPoshtaSenderProfile> SenderProfiles { get; }

    public NovaPoshtaSenderProfile? DefaultSenderProfile => SenderProfiles.FirstOrDefault();

    public async Task<NovaPoshtaWaybill> CreateWaybillAsync(
        string senderProfileId,
        NovaPoshtaSenderAddress? senderAddressOverride,
        string recipientFirstName,
        string recipientLastName,
        string recipientPhone,
        string cityRef,
        string warehouseRef,
        decimal declaredCost,
        CancellationToken ct = default)
    {
        var profile = SenderProfiles.FirstOrDefault(p => p.Id == senderProfileId)
            ?? throw new InvalidOperationException($"Unknown Nova Poshta sender '{senderProfileId}'.");

        var senderCityRef = senderAddressOverride?.CityRef ?? profile.DefaultCityRef;
        var senderWarehouseRef = senderAddressOverride?.WarehouseRef ?? profile.DefaultWarehouseRef;
        if (string.IsNullOrWhiteSpace(senderCityRef) || string.IsNullOrWhiteSpace(senderWarehouseRef))
            throw new InvalidOperationException($"No ship-from address configured for sender '{profile.Label}'.");

        var recipient = await CallAsync(
            profile.ApiKey,
            "Counterparty",
            "save",
            new
            {
                FirstName = recipientFirstName,
                LastName = recipientLastName,
                Phone = recipientPhone,
                CounterpartyType = "PrivatePerson",
                CounterpartyProperty = "Recipient",
            },
            ct);

        var recipientData = recipient["data"]?.AsArray().FirstOrDefault()
            ?? throw new InvalidOperationException("Nova Poshta did not return a recipient counterparty.");
        var recipientRef = recipientData["Ref"]!.GetValue<string>();
        var recipientContactRef = recipientData["ContactPerson"]?["data"]?.AsArray().FirstOrDefault()?["Ref"]?.GetValue<string>()
            ?? throw new InvalidOperationException("Nova Poshta did not return a recipient contact person.");

        var waybill = await CallAsync(
            profile.ApiKey,
            "InternetDocument",
            "save",
            new
            {
                PayerType = "Recipient",
                PaymentMethod = "Cash",
                CargoType = "Parcel",
                ServiceType = "WarehouseWarehouse",
                SeatsAmount = "1",
                Weight = DefaultWeightKg.ToString("0.##"),
                Cost = declaredCost.ToString("0.##"),
                Description = "Товар",
                CitySender = senderCityRef,
                Sender = profile.SenderRef,
                SenderAddress = senderWarehouseRef,
                ContactSender = profile.ContactRef,
                SendersPhone = profile.Phone,
                CityRecipient = cityRef,
                Recipient = recipientRef,
                RecipientAddress = warehouseRef,
                ContactRecipient = recipientContactRef,
                RecipientsPhone = recipientPhone,
            },
            ct);

        var waybillData = waybill["data"]?.AsArray().FirstOrDefault()
            ?? throw new InvalidOperationException("Nova Poshta did not return a waybill.");

        return new NovaPoshtaWaybill(
            waybillData["IntDocNumber"]!.GetValue<string>(),
            waybillData["Ref"]!.GetValue<string>());
    }

    public async Task<NovaPoshtaTrackingStatus?> GetTrackingStatusAsync(string ttnNumber, CancellationToken ct = default)
    {
        var apiKey = DefaultSenderProfile?.ApiKey;
        if (apiKey == null)
            return null;

        var result = await CallAsync(
            apiKey,
            "TrackingDocument",
            "getStatusDocuments",
            new { Documents = new[] { new { DocumentNumber = ttnNumber } } },
            ct);

        var data = result["data"]?.AsArray().FirstOrDefault();
        if (data == null)
            return null;

        return new NovaPoshtaTrackingStatus(
            data["Status"]?.GetValue<string>() ?? "Unknown",
            data["StatusCode"]?.GetValue<string>() ?? string.Empty);
    }

    public async Task<decimal?> GetShippingPriceAsync(string recipientCityRef, decimal declaredCost, CancellationToken ct = default)
    {
        var senderCityRef = DefaultSenderProfile?.DefaultCityRef;
        if (senderCityRef == null)
            return null;

        // Keyless endpoint -- no apiKey needed, works before checkout has an order or account.
        var result = await CallAsync(
            apiKey: string.Empty,
            "InternetDocument",
            "getDocumentPrice",
            new
            {
                CitySender = senderCityRef,
                CityRecipient = recipientCityRef,
                Weight = DefaultWeightKg.ToString("0.##"),
                ServiceType = "WarehouseWarehouse",
                Cost = declaredCost.ToString("0.##"),
                CargoType = "Parcel",
                SeatsAmount = "1",
            },
            ct);

        var data = result["data"]?.AsArray().FirstOrDefault();
        return data?["Cost"]?.GetValue<decimal>();
    }

    public async Task<IReadOnlyList<NovaPoshtaCity>> GetCitiesAsync(CancellationToken ct = default)
    {
        // ponytail: single Limit=20000 page, no loop over Page — Nova Poshta's whole network is
        // ~15k settlements as of writing, comfortably under one page. Revisit with real
        // pagination if their network ever grows past this Limit.
        var result = await CallAsync(
            apiKey: string.Empty,
            "Address",
            "getCities",
            new { Limit = "20000" },
            ct);

        return result["data"]?.AsArray()
            .Select(item => new NovaPoshtaCity(
                item!["Ref"]!.GetValue<string>(),
                item["Description"]?.GetValue<string>() ?? string.Empty))
            .Where(c => c.Name.Length > 0)
            .ToList()
            ?? [];
    }

    public async Task<IReadOnlyList<NovaPoshtaWarehouse>> GetWarehousesAsync(string cityRef, CancellationToken ct = default)
    {
        var result = await CallAsync(
            apiKey: string.Empty,
            "Address",
            "getWarehouses",
            new { CityRef = cityRef, Limit = "500" },
            ct);

        return result["data"]?.AsArray()
            .Select(item => new NovaPoshtaWarehouse(
                item!["Ref"]!.GetValue<string>(),
                item["CityRef"]?.GetValue<string>() ?? cityRef,
                item["Description"]?.GetValue<string>() ?? string.Empty,
                item["ShortAddress"]?.GetValue<string>() ?? string.Empty,
                item["Number"]?.GetValue<string>() ?? string.Empty))
            .ToList()
            ?? [];
    }

    public async Task<bool> DeleteWaybillAsync(string senderProfileId, string ttnRef, CancellationToken ct = default)
    {
        var profile = SenderProfiles.FirstOrDefault(p => p.Id == senderProfileId)
            ?? throw new InvalidOperationException($"Unknown Nova Poshta sender '{senderProfileId}'.");

        var result = await CallAsync(
            profile.ApiKey,
            "InternetDocument",
            "delete",
            new { DocumentRefs = ttnRef },
            ct);

        return result["data"]?.AsArray().Count > 0;
    }

    private async Task<JsonObject> CallAsync(string apiKey, string modelName, string calledMethod, object methodProperties, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var payload = new
        {
            apiKey,
            modelName,
            calledMethod,
            methodProperties,
        };

        // PostAsJsonAsync defaults to camelCase property names unless told otherwise, but Nova
        // Poshta's API is case-sensitive and only recognizes exact PascalCase (e.g.
        // "CounterpartyType", not "counterpartyType") -- JsonSerializerOptions.Default preserves
        // the property names exactly as declared below.
        using var response = await client.PostAsJsonAsync(Endpoint, payload, JsonSerializerOptions.Default, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        var json = JsonNode.Parse(body)?.AsObject()
            ?? throw new InvalidOperationException("Nova Poshta returned an unparseable response.");

        var success = json["success"]?.GetValue<bool>() ?? false;
        if (!success)
        {
            var errors = string.Join("; ", json["errors"]?.AsArray().Select(e => e?.GetValue<string>()) ?? []);
            _logger.LogError(
                "Nova Poshta {Model}.{Method} failed: {Errors}. methodProperties sent: {MethodProperties}",
                modelName,
                calledMethod,
                errors,
                JsonSerializer.Serialize(methodProperties));
            throw new InvalidOperationException($"Nova Poshta request failed: {errors}");
        }

        return json;
    }
}
