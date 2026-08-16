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

                        KpiRow(table, "Sold Revenue (Received Orders)", report.SoldRevenue, bold: true,
                            color: Colors.Green.Darken2);
                        KpiRow(table, "Import Spend",    report.ImportSpend);
                        KpiRow(table, "Expense Spend",   report.ExpenseSpend);
                        KpiRow(table, "Total Spent",     report.TotalSpent,  bold: true);
                        KpiRow(table, "Net",             report.Net,         bold: true,
                            color: report.Net >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                    });

                    // Sold Orders
                    if (report.Orders.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold())
                            .Text($"Sold Orders ({report.Orders.Count})");

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

                    // Import Transactions
                    if (report.ImportTransactions.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold())
                            .Text($"Import Transactions ({report.ImportTransactions.Count})");

                        col.Item().PaddingTop(4).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.ConstantColumn(38);
                                cols.RelativeColumn(3);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.ConstantColumn(40);
                                cols.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "ID", "Supplier", "Date", "Invoice", "Lines", "Total" })
                                    HeaderCell(header, h);
                            });

                            foreach (var t in report.ImportTransactions)
                            {
                                table.Cell().Padding(3).Text(t.Id.ToString());
                                table.Cell().Padding(3).Text(t.Supplier ?? "—");
                                table.Cell().Padding(3).Text(t.TransactionDate.ToString("yyyy-MM-dd"));
                                table.Cell().Padding(3).Text(t.InvoiceRef ?? "—");
                                table.Cell().Padding(3).AlignCenter().Text(t.LineCount.ToString());
                                table.Cell().Padding(3).AlignRight().Text(Curr(t.TotalAmount));
                            }
                        });
                    }

                    // Expenses by category
                    if (report.ExpensesByCategory.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold())
                            .Text("Expenses by Category");

                        foreach (var cat in report.ExpensesByCategory)
                        {
                            col.Item().PaddingTop(8).Row(row =>
                            {
                                row.RelativeItem()
                                    .DefaultTextStyle(x => x.FontSize(11).SemiBold())
                                    .Text(cat.Category);
                                row.AutoItem()
                                    .DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Darken2))
                                    .Text($"Total: {Curr(cat.TotalAmount)}");
                            });

                            col.Item().PaddingTop(2).Table(table =>
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

                                foreach (var item in cat.Items)
                                {
                                    table.Cell().Padding(3).Text(item.Name);
                                    table.Cell().Padding(3).Text(item.Description ?? "—");
                                    table.Cell().Padding(3).Text(item.ExpenseDate.ToString("yyyy-MM-dd"));
                                    table.Cell().Padding(3).AlignRight().Text(Curr(item.Amount));
                                }
                            });
                        }
                    }

                    // Stock Snapshot
                    if (report.StockSnapshot.Count > 0)
                    {
                        col.Item().PaddingTop(16).DefaultTextStyle(x => x.FontSize(13).Bold())
                            .Text("Material Stock Snapshot");

                        col.Item().PaddingTop(4).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(3);
                                cols.ConstantColumn(40);
                                cols.ConstantColumn(60);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                foreach (var h in new[] { "Material", "Unit", "On Hand", "Avg Cost", "Total Value", "" })
                                    HeaderCell(header, h);
                            });

                            foreach (var s in report.StockSnapshot)
                            {
                                table.Cell().Padding(3).Text(s.MaterialName);
                                table.Cell().Padding(3).AlignCenter().Text(s.MaterialUnit);
                                table.Cell().Padding(3).AlignRight().Text(s.QtyOnHand.ToString("N2"));
                                table.Cell().Padding(3).AlignRight().Text(Curr(s.AvgUnitCost));
                                table.Cell().Padding(3).AlignRight().Text(Curr(s.TotalValue));
                                table.Cell().Padding(3);
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
