namespace YarneAPIBack.Services.Contracts;

public interface IStorefrontSettingsService
{
    bool IsAllowedKey(string key);

    Task<string?> GetValueJsonAsync(string key, CancellationToken ct = default);

    Task<string> UpsertValueJsonAsync(string key, string valueJson, CancellationToken ct = default);
}
