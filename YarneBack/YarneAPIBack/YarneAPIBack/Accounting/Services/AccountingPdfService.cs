using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using YarneAPIBack.Accounting.DTOs;
using YarneAPIBack.Accounting.Services.Contracts;

namespace YarneAPIBack.Accounting.Services;

public class AccountingPdfService : IAccountingPdfService
{
    static AccountingPdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateReport(AccountingReportDto report)
    {
        var fromLabel = report.DateFrom.HasValue ? report.DateFrom.Value.ToString("yyyy-MM-dd") : "start";
        var toLabel   = report.DateTo.HasValue   ? report.DateTo.Value.ToString("yyyy-MM-dd")   : "today";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Arial));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem()
                            .DefaultTextStyle(x => x.FontSize(18).Bold())
                            .Text("Yarne — Accounting Report");

                        row.ConstantItem(150).AlignRight()
                            .DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Medium))
                            .Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd}");
                    });

                    col.Item()
                        .DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken2))
                        .Text($"Period: {fromLabel} → {toLabel}");

                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(12).Column(col =>
                {
                    // KPI Summary
                    col.Item().DefaultTextStyle(x => x.FontSize(13).Bold()).Text("Summary");

                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                        });

                        KpiRow(table, "Order Revenue",       report.OrderRevenue);
                        KpiRow(table, "Manual Sale Revenue", report.ManualSaleRevenue);
                        KpiRow(table, "Total Revenue",       report.TotalRevenue,  bold: true);
                        KpiRow(table, "Purchase Spend",      report.PurchaseSpend);
                        KpiRow(table, "Marketing Spend",     report.MarketingSpend);
                        KpiRow(table, "Total Spent",         report.TotalSpent,    bold: true);
                        KpiRow(table, "Net",                 report.Net,           bold: true,
                            color: report.Net >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                    });

                    // Orders
                    if (report.Orders.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold()).Text("Orders");

                        col.Item().PaddingTop(4).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.ConstantColumn(42);
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "ID", "Customer", "Date", "Status", "Total" })
                                    HeaderCell(header, h);
                            });

                            foreach (var o in report.Orders)
                            {
                                table.Cell().Padding(3).Text(o.OrderId.ToString());
                                table.Cell().Padding(3).Text(o.CustomerName);
                                table.Cell().Padding(3).Text(o.OrderDate.ToString("yyyy-MM-dd"));
                                table.Cell().Padding(3).Text(o.Status);
                                table.Cell().Padding(3).AlignRight().Text(Curr(o.Total));
                            }
                        });
                    }

                    // Purchases by category
                    if (report.PurchasesByCategory.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold()).Text("Purchases by Category");

                        foreach (var cat in report.PurchasesByCategory)
                        {
                            col.Item().PaddingTop(8).Row(row =>
                            {
                                row.RelativeItem()
                                    .DefaultTextStyle(x => x.FontSize(11).SemiBold())
                                    .Text(cat.CategoryName);
                                row.AutoItem()
                                    .DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Darken2))
                                    .Text($"Cost: {Curr(cat.TotalCost)}   Revenue: {Curr(cat.TotalSaleRevenue)}");
                            });

                            col.Item().PaddingTop(2).Table(table =>
                            {
                                table.ColumnsDefinition(cols =>
                                {
                                    cols.RelativeColumn(3);
                                    cols.RelativeColumn(2);
                                    cols.ConstantColumn(40);
                                    cols.ConstantColumn(40);
                                    cols.RelativeColumn(2);
                                    cols.RelativeColumn(2);
                                });

                                table.Header(header =>
                                {
                                    foreach (var h in new[] { "Name", "Supplier", "Qty", "Sold", "Unit Cost", "Total" })
                                        HeaderCell(header, h);
                                });

                                foreach (var item in cat.Items)
                                {
                                    table.Cell().Padding(3).Text(item.Name);
                                    table.Cell().Padding(3).Text(item.Supplier ?? "—");
                                    table.Cell().Padding(3).AlignRight().Text(item.Quantity.ToString());
                                    table.Cell().Padding(3).AlignRight().Text(item.QuantitySold.ToString());
                                    table.Cell().Padding(3).AlignRight().Text(Curr(item.UnitCost));
                                    table.Cell().Padding(3).AlignRight().Text(Curr(item.TotalCost));
                                }
                            });
                        }
                    }

                    // Marketing
                    if (report.MarketingItems.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold()).Text("Marketing Expenditures");

                        col.Item().PaddingTop(4).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "Name", "Description", "Date", "Amount" })
                                    HeaderCell(header, h);
                            });

                            foreach (var m in report.MarketingItems)
                            {
                                table.Cell().Padding(3).Text(m.Name);
                                table.Cell().Padding(3).Text(m.Description ?? "—");
                                table.Cell().Padding(3).Text(m.ExpenseDate.ToString("yyyy-MM-dd"));
                                table.Cell().Padding(3).AlignRight().Text(Curr(m.Amount));
                            }
                        });
                    }

                    // Remaining inventory
                    if (report.RemainingInventory.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold()).Text("Remaining Inventory");

                        col.Item().PaddingTop(4).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(2);
                                cols.ConstantColumn(55);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "Name", "Category", "Qty Left", "Unit Cost", "Value" })
                                    HeaderCell(header, h);
                            });

                            foreach (var inv in report.RemainingInventory)
                            {
                                table.Cell().Padding(3).Text(inv.Name);
                                table.Cell().Padding(3).Text(inv.CategoryName);
                                table.Cell().Padding(3).AlignRight().Text(inv.QuantityRemaining.ToString());
                                table.Cell().Padding(3).AlignRight().Text(Curr(inv.UnitCost));
                                table.Cell().Padding(3).AlignRight().Text(Curr(inv.RemainingValue));
                            }
                        });
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontSize(9).FontColor(Colors.Grey.Medium);
                    text.Span(" / ").FontSize(9).FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontSize(9).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    private static void KpiRow(TableDescriptor table, string label, decimal value, bool bold = false, string? color = null)
    {
        var labelStyle = bold
            ? table.Cell().PaddingVertical(2).DefaultTextStyle(x => x.Bold())
            : table.Cell().PaddingVertical(2);
        labelStyle.Text(label);

        var valueContainer = table.Cell().PaddingVertical(2).AlignRight();
        if (bold && color != null)
            valueContainer.DefaultTextStyle(x => x.Bold().FontColor(color)).Text(Curr(value));
        else if (bold)
            valueContainer.DefaultTextStyle(x => x.Bold()).Text(Curr(value));
        else if (color != null)
            valueContainer.DefaultTextStyle(x => x.FontColor(color)).Text(Curr(value));
        else
            valueContainer.Text(Curr(value));
    }

    private static void HeaderCell(TableCellDescriptor header, string text)
    {
        header.Cell()
            .Background(Colors.Grey.Lighten3)
            .Padding(4)
            .DefaultTextStyle(x => x.Bold().FontSize(9))
            .Text(text);
    }

    private static string Curr(decimal value) => $"₴{value:N2}";
}
