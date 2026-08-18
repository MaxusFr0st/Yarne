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

    public async Task<string> UploadAsync(Stream content, string contentType, string fileExtension, CancellationToken ct = default)
    {
        if (_client == null)
            throw new InvalidOperationException("R2 storage is not configured.");

        var key = $"{Guid.NewGuid():N}{fileExtension}";
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _settings.BucketName,
            Key = key,
            InputStream = content,
            ContentType = contentType,
        }, ct);

        return $"{_settings.PublicUrl.TrimEnd('/')}/{key}";
    }

    public async Task DeleteAsync(string? publicUrl, CancellationToken ct = default)
    {
        if (_client == null || string.IsNullOrWhiteSpace(publicUrl)) return;

        var prefix = $"{_settings.PublicUrl.TrimEnd('/')}/";
        if (!publicUrl.StartsWith(prefix, StringComparison.Ordinal)) return;

        var key = publicUrl[prefix.Length..];
        await _client.DeleteObjectAsync(_settings.BucketName, key, ct);
    }
}
