using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Services;

public sealed class R2ImageStorageService : IR2ImageStorageService
{
    private readonly R2Settings _settings;
    private readonly AmazonS3Client? _client;

    public R2ImageStorageService(IOptions<R2Settings> settings)
    {
        _settings = settings.Value;
        if (_settings.IsConfigured)
        {
            _client = new AmazonS3Client(
                _settings.AccessKeyId,
                _settings.SecretAccessKey,
                new AmazonS3Config
                {
                    ServiceURL = $"https://{_settings.AccountId}.r2.cloudflarestorage.com",
                    ForcePathStyle = true,
                });
        }
    }

    public bool IsConfigured => _client != null;

    public Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default) =>
        UploadWithKeyAsync(content, contentType, $"{Guid.NewGuid():N}{fileExtension}", ct);

    public async Task<string> UploadWithKeyAsync(Stream content, string contentType, string key, CancellationToken ct = default)
    {
        if (_client == null)
            throw new InvalidOperationException("R2 storage is not configured.");

        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _settings.BucketName,
            Key = key,
            InputStream = content,
            ContentType = contentType,
        }, ct);

        return BuildPublicUrl(key);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        if (_client == null || string.IsNullOrWhiteSpace(key)) return false;

        try
        {
            await _client.GetObjectMetadataAsync(_settings.BucketName, key, ct);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public string BuildPublicUrl(string key) => $"{_settings.PublicUrl.TrimEnd('/')}/{key}";

    public async Task DeleteAsync(string? publicUrl, CancellationToken ct = default)
    {
        if (_client == null || string.IsNullOrWhiteSpace(publicUrl)) return;

        var key = TryResolveKey(publicUrl);
        if (key == null) return;

        await _client.DeleteObjectAsync(_settings.BucketName, key, ct);
    }

    /// <summary>
    /// Maps a stored public URL back to its bucket key. Matches the configured PublicUrl host and
    /// any *.r2.dev host: switching PublicUrl to a custom domain leaves older rows still holding
    /// the bucket's pub-xxx.r2.dev address, and a plain prefix check would silently stop deleting
    /// those, orphaning the objects. Every R2 URL this app stores came from this one bucket.
    /// </summary>
    private string? TryResolveKey(string publicUrl)
    {
        if (!Uri.TryCreate(publicUrl, UriKind.Absolute, out var uri))
            return null;

        var isConfiguredHost = Uri.TryCreate(_settings.PublicUrl, UriKind.Absolute, out var configured)
            && string.Equals(uri.Host, configured.Host, StringComparison.OrdinalIgnoreCase);
        var isDevHost = uri.Host.EndsWith(".r2.dev", StringComparison.OrdinalIgnoreCase);

        if (!isConfiguredHost && !isDevHost)
            return null;

        var key = uri.AbsolutePath.TrimStart('/');
        return string.IsNullOrWhiteSpace(key) ? null : Uri.UnescapeDataString(key);
    }
}
