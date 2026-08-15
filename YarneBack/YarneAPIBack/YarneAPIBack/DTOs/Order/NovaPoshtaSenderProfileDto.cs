namespace YarneAPIBack.DTOs.Order;

public class NovaPoshtaSenderProfileDto
{
    public string Id { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public string? DefaultCityRef { get; set; }

    public string? DefaultCityName { get; set; }

    public string? DefaultWarehouseRef { get; set; }

    public string? DefaultWarehouseName { get; set; }
}
