using System.Text.Json;

namespace YarneAPIBack.Configuration;

public static class StorefrontSettingValidators
{
    private const int GuaranteeTitleMaxLength = 120;
    private const int GuaranteeDescriptionMaxLength = 2000;

    public static string? ValidateProductGuarantee(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Object)
            return "Guarantee content must be a JSON object.";

        foreach (var (field, max) in new (string Field, int Max)[]
        {
            ("titleEn", GuaranteeTitleMaxLength),
            ("descriptionEn", GuaranteeDescriptionMaxLength),
            ("titleUk", GuaranteeTitleMaxLength),
            ("descriptionUk", GuaranteeDescriptionMaxLength),
        })
        {
            if (!value.TryGetProperty(field, out var prop))
                continue;

            if (prop.ValueKind != JsonValueKind.String)
                return $"{field} must be a string.";

            var text = prop.GetString() ?? string.Empty;
            if (text.Length > max)
                return $"{field} exceeds {max} characters.";
        }

        return null;
    }
}
