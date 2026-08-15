namespace YarneAPIBack.DTOs.Order;

/// <summary>
/// Which registered sender to ship as, and an optional ship-from address override. Sender
/// identity (name/phone) itself is never overridable — Nova Poshta's API only allows one
/// fixed sender contact per account, so "who sends" means picking a configured account
/// (SenderProfileId), not editing a name/phone field.
/// </summary>
public class CreateWaybillRequest
{
    public string? SenderProfileId { get; set; }

    public string? SenderCityRef { get; set; }

    public string? SenderWarehouseRef { get; set; }
}
