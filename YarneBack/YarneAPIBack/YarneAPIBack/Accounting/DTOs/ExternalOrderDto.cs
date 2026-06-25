namespace YarneAPIBack.Accounting.DTOs;

public class ExternalOrderDto
{
    public int Id { get; set; }
    public string DisplayId { get; set; } = string.Empty;
    public string? Label { get; set; }
    public string? CustomerName { get; set; }
    public DateTime OrderDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateExternalOrderRequest
{
    public string? Label { get; set; }
    public string? CustomerName { get; set; }
    public DateTime OrderDate { get; set; }
    public string? Notes { get; set; }
}

public class UsageOrderOptionsDto
{
    public List<WebsiteOrderOptionDto> WebsiteOrders { get; set; } = [];
    public List<ExternalOrderOptionDto> ExternalOrders { get; set; } = [];
}

public class WebsiteOrderOptionDto
{
    public int OrderId { get; set; }
    public string DisplayId { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

public class ExternalOrderOptionDto
{
    public int Id { get; set; }
    public string DisplayId { get; set; } = string.Empty;
    public string? Label { get; set; }
    public string? CustomerName { get; set; }
    public DateTime OrderDate { get; set; }
}
