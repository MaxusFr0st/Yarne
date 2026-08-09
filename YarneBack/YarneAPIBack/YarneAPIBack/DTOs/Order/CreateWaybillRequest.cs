namespace YarneAPIBack.DTOs.Order;

/// <summary>
/// Optional sender override for waybill creation. When any field is provided, all of
/// FirstName/LastName/Phone/CityRef/WarehouseRef must be — otherwise the server falls back
/// to the configured default sender.
/// </summary>
public class CreateWaybillRequest
{
    public string? SenderFirstName { get; set; }

    public string? SenderLastName { get; set; }

    public string? SenderMiddleName { get; set; }

    public string? SenderPhone { get; set; }

    public string? SenderCityRef { get; set; }

    public string? SenderWarehouseRef { get; set; }
}
