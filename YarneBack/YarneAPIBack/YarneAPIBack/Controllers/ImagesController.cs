using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using YarneAPIBack.Configuration;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagesController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ImagesController> _logger;
    private readonly IAdminActivityLogService _activityLogs;
    private readonly IImageUploadNormalizer _imageNormalizer;
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private static readonly string[] AllowedMimeTypes = { "image/jpeg", "image/png", "image/gif", "image/webp" };
    private const int MaxFileSizeBytes = 15 * 1024 * 1024; // 15 MB — normalized to WebP on save

    public ImagesController(
        IWebHostEnvironment env,
        ILogger<ImagesController> logger,
        IAdminActivityLogService activityLogs,
        IImageUploadNormalizer imageNormalizer)
    {
        _env = env;
        _logger = logger;
        _activityLogs = activityLogs;
        _imageNormalizer = imageNormalizer;
    }

    [HttpPost("upload")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> Upload(IFormFile file, CancellationToken ct = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            return BadRequest(new { message = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" });

        var contentType = (file.ContentType ?? "").Trim().ToLowerInvariant();
        if (contentType == "image/jpg") contentType = "image/jpeg";

        if (string.IsNullOrWhiteSpace(contentType) || !AllowedMimeTypes.Contains(contentType))
        {
            var inferred = InferMimeTypeFromExtension(ext);
            if (inferred == null)
                return BadRequest(new { message = "Invalid content type for image upload" });
        }

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File too large. Max 15 MB" });

        await using var uploadStream = file.OpenReadStream();
        var header = new byte[12];
        var read = await uploadStream.ReadAsync(header, ct);
        if (!HasValidSignature(ext, header, read))
            return BadRequest(new { message = "File signature does not match the extension" });

        uploadStream.Position = 0;

        NormalizedUploadImage normalized;
        try
        {
            normalized = await _imageNormalizer.NormalizeAsync(uploadStream, ct);
        }
        catch (UnknownImageFormatException)
        {
            return BadRequest(new { message = "Could not read image file" });
        }
        catch (InvalidImageContentException)
        {
            return BadRequest(new { message = "Image file is corrupted or unsupported" });
        }

        await using (normalized.Output)
        {
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsDir = Path.Combine(webRoot, "uploads");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid():N}{normalized.FileExtension}";
            var filePath = Path.Combine(uploadsDir, fileName);

            try
            {
                await using var stream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                await normalized.Output.CopyToAsync(stream, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save normalized upload");
                return StatusCode(500, new { message = "Failed to save file" });
            }

            var url = $"/uploads/{fileName}";
            var outputSize = normalized.Output.Length;

            var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
            await _activityLogs.LogAsync(
                "image",
                "uploaded",
                $"Uploaded image {file.FileName}",
                fileName,
                file.FileName,
                new
                {
                    imageUrl = url,
                    fileName,
                    originalFileName = file.FileName,
                    originalSizeBytes = file.Length,
                    sizeBytes = outputSize,
                    width = normalized.Width,
                    height = normalized.Height,
                    contentType = normalized.ContentType,
                },
                actorUserId,
                actorEmail,
                ct);

            return Ok(new { url });
        }
    }

    /// <summary>
    /// Admin-only proxy for cropping existing uploads without cross-origin static file fetches.
    /// </summary>
    [HttpGet("file")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult GetUploadFile([FromQuery] string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return BadRequest(new { message = "path is required" });

        var normalized = path.Trim().Replace('\\', '/');
        if (!normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only /uploads/ paths are allowed" });

        var fileName = Path.GetFileName(normalized);
        if (string.IsNullOrEmpty(fileName) || fileName.Contains("..", StringComparison.Ordinal))
            return BadRequest(new { message = "Invalid path" });

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var filePath = Path.Combine(webRoot, "uploads", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "File not found" });

        var contentType = fileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase) ? "image/webp"
            : fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png"
            : fileName.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ? "image/gif"
            : "image/jpeg";

        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }

    private static string? InferMimeTypeFromExtension(string extension) =>
        extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => null,
        };

    private static bool HasValidSignature(string extension, byte[] header, int bytesRead)
    {
        if (bytesRead < 4) return false;

        return extension switch
        {
            ".jpg" or ".jpeg" => bytesRead >= 3
                && header[0] == 0xFF
                && header[1] == 0xD8
                && header[2] == 0xFF,
            ".png" => bytesRead >= 8
                && header[0] == 0x89
                && header[1] == 0x50
                && header[2] == 0x4E
                && header[3] == 0x47
                && header[4] == 0x0D
                && header[5] == 0x0A
                && header[6] == 0x1A
                && header[7] == 0x0A,
            ".gif" => bytesRead >= 6
                && header[0] == 0x47
                && header[1] == 0x49
                && header[2] == 0x46
                && header[3] == 0x38
                && (header[4] == 0x37 || header[4] == 0x39)
                && header[5] == 0x61,
            ".webp" => bytesRead >= 12
                && header[0] == 0x52
                && header[1] == 0x49
                && header[2] == 0x46
                && header[3] == 0x46
                && header[8] == 0x57
                && header[9] == 0x45
                && header[10] == 0x42
                && header[11] == 0x50,
            _ => false,
        };
    }
}
