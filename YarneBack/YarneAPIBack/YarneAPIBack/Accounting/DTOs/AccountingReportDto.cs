namespace YarneAPIBack.Accounting.DTOs;

public class AccountingReportRequest
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public List<int>? CategoryIds { get; set; }
    public bool IncludeOrders { get; set; } = true;
    public bool IncludePurchases { get; set; } = true;
    public bool IncludeMarketing { get; set; } = true;
}

public class AccountingReportDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }

    public decimal OrderRevenue { get; set; }
    public decimal ManualSaleRevenue { get; set; }
    public decimal TotalRevenue { get; set; }

    public decimal PurchaseSpend { get; set; }
    public decimal MarketingSpend { get; set; }
    public decimal TotalSpent { get; set; }

    public decimal Net { get; set; }

    public List<ReportOrderLineDto> Orders { get; set; } = [];
    public List<ReportCategoryBreakdownDto> PurchasesByCategory { get; set; } = [];
    public List<ReportMarketingLineDto> MarketingItems { get; set; } = [];
    public List<ReportInventoryItemDto> RemainingInventory { get; set; } = [];
}

public class ReportOrderLineDto
{
    public int OrderId { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string CustomerName { get; set; } = string.Empty;
}

public class ReportCategoryBreakdownDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalCost { get; set; }
    public decimal TotalSaleRevenue { get; set; }
    public List<ReportPurchaseLineDto> Items { get; set; } = [];
}

public class ReportPurchaseLineDto
{
    public int PurchaseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Supplier { get; set; }
    public DateTime PurchaseDate { get; set; }
    public int Quantity { get; set; }
    public int QuantitySold { get; set; }
    public decimal UnitCost { get; set; }
    public decimal? SaleUnitPrice { get; set; }
    public decimal TotalCost { get; set; }
    public decimal SaleRevenue { get; set; }
}

public class ReportMarketingLineDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Description { get; set; }
}

public class ReportInventoryItemDto
{
    public int PurchaseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int QuantityRemaining { get; set; }
    public decimal UnitCost { get; set; }
    public decimal RemainingValue { get; set; }
}
