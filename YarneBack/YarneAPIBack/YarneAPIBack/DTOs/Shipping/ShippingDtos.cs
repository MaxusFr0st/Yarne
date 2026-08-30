namespace YarneAPIBack.DTOs.Shipping;

public class CityDto
{
    public string Ref { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class WarehouseDto
{
    public string Ref { get; set; } = null!;
    public string CityRef { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string ShortAddress { get; set; } = null!;
    public string Number { get; set; } = null!;
}
