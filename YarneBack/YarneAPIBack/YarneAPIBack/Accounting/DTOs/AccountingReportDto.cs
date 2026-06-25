namespace YarneAPIBack.Accounting.DTOs;

public class AccountingReportRequest
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public bool IncludeOrders { get; set; } = true;
    public bool IncludeImports { get; set; } = true;
    public bool IncludeExpenses { get; set; } = true;
    public bool IncludeStock { get; set; } = true;
}

public class AccountingReportDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }

    public decimal SoldRevenue { get; set; }
    public decimal ImportSpend { get; set; }
    public decimal ExpenseSpend { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal Net { get; set; }

    public List<ReportOrderLineDto> Orders { get; set; } = [];
    public List<ReportImportSummaryDto> ImportTransactions { get; set; } = [];
    public List<ReportExpenseCategoryDto> ExpensesByCategory { get; set; } = [];
    public List<ReportStockLineDto> StockSnapshot { get; set; } = [];
}

public class ReportOrderLineDto
{
    public int OrderId { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string CustomerName { get; set; } = string.Empty;
}

public class ReportImportSummaryDto
{
    public int Id { get; set; }
    public string? Supplier { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? InvoiceRef { get; set; }
    public decimal TotalAmount { get; set; }
    public int LineCount { get; set; }
}

public class ReportExpenseLineDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Description { get; set; }
}

public class ReportExpenseCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public List<ReportExpenseLineDto> Items { get; set; } = [];
}

public class ReportStockLineDto
{
    public int MaterialId { get; set; }
    public string MaterialName { get; set; } = string.Empty;
    public string MaterialUnit { get; set; } = string.Empty;
    public decimal QtyOnHand { get; set; }
    public decimal AvgUnitCost { get; set; }
    public decimal TotalValue { get; set; }
}
