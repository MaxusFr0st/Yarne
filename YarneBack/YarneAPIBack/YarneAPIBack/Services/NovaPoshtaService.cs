using System.Net.Http.Json;
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
    private readonly string? _apiKey;
    private readonly string? _senderRef;

    public NovaPoshtaService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<NovaPoshtaService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = Read(configuration, "NOVA_POSHTA_API_KEY");
        _senderRef = Read(configuration, "NOVA_POSHTA_SENDER_REF");

        var firstName = Read(configuration, "NOVA_POSHTA_SENDER_FIRST_NAME");
        var lastName = Read(configuration, "NOVA_POSHTA_SENDER_LAST_NAME");
        var middleName = Read(configuration, "NOVA_POSHTA_SENDER_MIDDLE_NAME");
        var phone = Read(configuration, "NOVA_POSHTA_SENDER_PHONE");
        var cityRef = Read(configuration, "NOVA_POSHTA_SENDER_CITY_REF");
        var warehouseRef = Read(configuration, "NOVA_POSHTA_SENDER_WAREHOUSE_REF");

        DefaultSender = !string.IsNullOrWhiteSpace(firstName)
            && !string.IsNullOrWhiteSpace(lastName)
            && !string.IsNullOrWhiteSpace(phone)
            && !string.IsNullOrWhiteSpace(cityRef)
            && !string.IsNullOrWhiteSpace(warehouseRef)
            ? new NovaPoshtaSender(firstName, lastName, middleName, phone, cityRef, warehouseRef)
            : null;
    }

    private static string? Read(IConfiguration configuration, string key) =>
        configuration[key] ?? Environment.GetEnvironmentVariable(key);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_senderRef);

    public NovaPoshtaSender? DefaultSender { get; }

    public async Task<NovaPoshtaWaybill> CreateWaybillAsync(
        NovaPoshtaSender sender,
        string recipientFirstName,
        string recipientLastName,
        string recipientPhone,
        string cityRef,
        string warehouseRef,
        decimal declaredCost,
        CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Nova Poshta is not configured (missing API key or sender counterparty).");

        var senderContactRef = await ResolveSenderContactRefAsync(sender, ct);

        var recipient = await CallAsync(
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
                CitySender = sender.CityRef,
                Sender = _senderRef,
                SenderAddress = sender.WarehouseRef,
                ContactSender = senderContactRef,
                SendersPhone = sender.Phone,
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
        if (!IsConfigured)
            return null;

        var result = await CallAsync(
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

    /// <summary>
    /// Finds an existing contact person under the sender counterparty matching this phone
    /// number, or registers a new one. Lets the admin pick "the usual sender" or type in
    /// someone new each time without maintaining a separate saved-senders list.
    /// </summary>
    private async Task<string> ResolveSenderContactRefAsync(NovaPoshtaSender sender, CancellationToken ct)
    {
        var normalizedPhone = new string(sender.Phone.Where(char.IsDigit).ToArray());

        var contacts = await CallAsync(
            "Counterparty",
            "getCounterpartyContactPersons",
            new { Ref = _senderRef, Page = "1" },
            ct);

        var existing = contacts["data"]?.AsArray().FirstOrDefault(contact =>
        {
            var phones = contact?["Phones"]?.GetValue<string>() ?? string.Empty;
            var digitsOnly = new string(phones.Where(char.IsDigit).ToArray());
            return digitsOnly.EndsWith(normalizedPhone, StringComparison.Ordinal) && normalizedPhone.Length > 0;
        });

        if (existing != null)
            return existing["Ref"]!.GetValue<string>();

        var created = await CallAsync(
            "ContactPerson",
            "save",
            new
            {
                CounterpartyRef = _senderRef,
                FirstName = sender.FirstName,
                LastName = sender.LastName,
                MiddleName = sender.MiddleName ?? string.Empty,
                Phone = sender.Phone,
            },
            ct);

        var createdData = created["data"]?.AsArray().FirstOrDefault()
            ?? throw new InvalidOperationException("Nova Poshta did not return a sender contact person.");
        return createdData["Ref"]!.GetValue<string>();
    }

    private async Task<JsonObject> CallAsync(string modelName, string calledMethod, object methodProperties, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        var payload = new
        {
            apiKey = _apiKey,
            modelName,
            calledMethod,
            methodProperties,
        };

        using var response = await client.PostAsJsonAsync(Endpoint, payload, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        var json = JsonNode.Parse(body)?.AsObject()
            ?? throw new InvalidOperationException("Nova Poshta returned an unparseable response.");

        var success = json["success"]?.GetValue<bool>() ?? false;
        if (!success)
        {
            var errors = string.Join("; ", json["errors"]?.AsArray().Select(e => e?.GetValue<string>()) ?? []);
            _logger.LogError("Nova Poshta {Model}.{Method} failed: {Errors}", modelName, calledMethod, errors);
            throw new InvalidOperationException($"Nova Poshta request failed: {errors}");
        }

        return json;
    }
}
