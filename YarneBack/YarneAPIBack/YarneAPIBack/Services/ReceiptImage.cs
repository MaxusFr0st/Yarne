namespace YarneAPIBack.Services;

/// <summary>Decides from the first bytes of a file (not its name or the declared type) whether it is a receipt image we accept: JPEG, PNG, WebP or HEIC, at most 5 MB.</summary>
public static class ReceiptImage
{
    public const long MaxBytes = 5 * 1024 * 1024;

    /// <summary>Content type and extension of the recognised image, or null when the bytes are not one of the accepted formats.</summary>
    public static (string ContentType, string Extension)? Sniff(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
            return ("image/jpeg", ".jpg");

        if (head.Length >= 8 && head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47
            && head[4] == 0x0D && head[5] == 0x0A && head[6] == 0x1A && head[7] == 0x0A)
            return ("image/png", ".png");

        if (head.Length >= 12 && head[0] == (byte)'R' && head[1] == (byte)'I' && head[2] == (byte)'F' && head[3] == (byte)'F'
            && head[8] == (byte)'W' && head[9] == (byte)'E' && head[10] == (byte)'B' && head[11] == (byte)'P')
            return ("image/webp", ".webp");

        // HEIC/HEIF: an ISO base media "ftyp" box with a heif-family brand.
        if (head.Length >= 12 && head[4] == (byte)'f' && head[5] == (byte)'t' && head[6] == (byte)'y' && head[7] == (byte)'p')
        {
            var brand = System.Text.Encoding.ASCII.GetString(head.Slice(8, 4));
            if (brand is "heic" or "heix" or "hevc" or "hevx" or "heim" or "heis" or "mif1" or "msf1")
                return ("image/heic", ".heic");
        }

        return null;
    }
}
