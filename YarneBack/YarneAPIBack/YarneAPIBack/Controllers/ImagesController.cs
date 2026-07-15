using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.Services;
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
    private readonly IUploadFileStorageService _uploadStorage;
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private static readonly string[] AllowedMimeTypes = { "image/jpeg", "image/png", "image/gif", "image/webp" };
    private const int MaxFileSizeBytes = 15 * 1024 * 1024; // 15 MB — normalized to WebP on save

    public ImagesController(
        IWebHostEnvironment env,
        ILogger<ImagesController> logger,
        IAdminActivityLogService activityLogs,
        IImageUploadNormalizer imageNormalizer,
        IUploadFileStorageService uploadStorage)
    {
        _env = env;
        _logger = logger;
        _activityLogs = activityLogs;
        _imageNormalizer = imageNormalizer;
        _uploadStorage = uploadStorage;
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
        if (contentType == "application/octet-stream")
        {
            var inferredOctet = InferMimeTypeFromExtension(ext);
            if (inferredOctet != null) contentType = inferredOctet;
        }

        if (string.IsNullOrWhiteSpace(contentType) || !AllowedMimeTypes.Contains(contentType))
        {
            var inferred = InferMimeTypeFromExtension(ext);
            if (inferred == null)
                return BadRequest(new { message = "Invalid content type for image upload" });
            contentType = inferred;
        }

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File too large. Max 15 MB" });

        await using var uploadStream = file.OpenReadStream();

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

            return Ok(new { url, focalX = normalized.FocalX, focalY = normalized.FocalY });
        }
    }

    [HttpDelete]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> DeleteUpload([FromQuery] string path, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(path))
            return BadRequest(new { message = "path is required" });

        var normalized = _uploadStorage.NormalizeUploadPath(path);
        if (string.IsNullOrWhiteSpace(normalized))
            return BadRequest(new { message = "Only /uploads/ paths can be deleted" });

        if (!_uploadStorage.TryResolveLocalPath(normalized, out var filePath))
            return BadRequest(new { message = "Invalid upload path" });

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "File not found" });

        var deleted = await _uploadStorage.TryDeleteIfUnreferencedAsync(normalized, ct);
        if (!deleted)
            return BadRequest(new { message = "Upload is still referenced and cannot be deleted" });

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "image",
            "deleted",
            $"Deleted image {normalized}",
            Path.GetFileName(normalized),
            normalized,
            new { imageUrl = normalized },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new { deleted = true, path = normalized });
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

    [HttpPost("backfill-focal-points")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> BackfillFocalPoints(
        [FromQuery] bool force = false,
        [FromServices] YarneDbContext db = null!,
        CancellationToken ct = default)
    {
        await FocalPointBackfill.RunAsync(db, _env, _logger, force, ct);
        return Ok(new { message = "Backfill complete" });
    }

    [HttpPatch("focal-point")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> UpdateFocalPoint(
        [FromBody] UpdateFocalPointRequest request,
        [FromServices] YarneDbContext db = null!,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return BadRequest(new { message = "imageUrl is required" });

        var normalized = request.ImageUrl.Trim().Replace('\\', '/');
        var fx = Math.Clamp(request.FocalX, 0f, 1f);
        var fy = Math.Clamp(request.FocalY, 0f, 1f);
        var updated = 0;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        updated += await db.ProductImages
            .Where(pi => pi.ImageUrl == normalized)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.FocalX, fx)
                .SetProperty(p => p.FocalY, fy), ct);

        updated += await db.ProductColorImages
            .Where(pi => pi.ImageUrl == normalized)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.FocalX, fx)
                .SetProperty(p => p.FocalY, fy), ct);

        updated += await db.ProductColorSizeImages
            .Where(pi => pi.ImageUrl == normalized)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.FocalX, fx)
                .SetProperty(p => p.FocalY, fy), ct);

        await tx.CommitAsync(ct);

        if (updated == 0)
            return NotFound(new { message = "No image rows found for the given URL" });

        var (actorUserId, actorEmail) = AdminActivityLogHelper.GetActor(HttpContext);
        await _activityLogs.LogAsync(
            "image",
            "focal-point-updated",
            $"Updated focal point for {normalized} to ({fx:F2}, {fy:F2})",
            Path.GetFileName(normalized),
            normalized,
            new { imageUrl = normalized, focalX = fx, focalY = fy, rowsUpdated = updated },
            actorUserId,
            actorEmail,
            ct);

        return Ok(new { updated, focalX = fx, focalY = fy });
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
}

public class UpdateFocalPointRequest
{
    public string ImageUrl { get; set; } = null!;
    public float FocalX { get; set; } = 0.5f;
    public float FocalY { get; set; } = 0.35f;
}
