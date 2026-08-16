using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Configuration;

namespace YarneAPIBack.Accounting.Services;

public sealed class CloudinaryUploadSignatureService
{
    private readonly CloudinarySettings _settings;

    public CloudinaryUploadSignatureService(IOptions<CloudinarySettings> settings)
    {
        _settings = settings.Value;
    }

    public CloudinaryUploadSignatureDto Create()
    {
        if (string.IsNullOrWhiteSpace(_settings.CloudName) ||
            string.IsNullOrWhiteSpace(_settings.ApiKey) ||
            string.IsNullOrWhiteSpace(_settings.ApiSecret) ||
            string.IsNullOrWhiteSpace(_settings.UploadPreset))
        {
            throw new InvalidOperationException(
                "Cloudinary is not configured. Set Cloudinary__CloudName, Cloudinary__ApiKey, " +
                "Cloudinary__ApiSecret, and Cloudinary__UploadPreset.");
        }

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var folder = string.IsNullOrWhiteSpace(_settings.Folder)
            ? "yarne/accounting"
            : _settings.Folder.Trim().Trim('/');
        var parameters =
            $"folder={folder}&timestamp={timestamp}&upload_preset={_settings.UploadPreset.Trim()}";
        var signatureBytes = SHA1.HashData(
            Encoding.UTF8.GetBytes(parameters + _settings.ApiSecret.Trim()));
        var signature = Convert.ToHexStringLower(signatureBytes);

        return new CloudinaryUploadSignatureDto(
            _settings.CloudName.Trim(),
            _settings.ApiKey.Trim(),
            _settings.UploadPreset.Trim(),
            folder,
            timestamp,
            signature);
    }
}
