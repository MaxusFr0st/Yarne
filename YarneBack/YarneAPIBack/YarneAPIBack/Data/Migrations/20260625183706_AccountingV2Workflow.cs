using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AccountingV2Workflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Expense",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ExpenseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expense", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ImportTransaction",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Supplier = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    InvoiceRef = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportTransaction", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Material",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "pcs"),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Material", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StockReport",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SnapshotDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    IsLocked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockReport", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ImportTransactionLine",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportTransactionId = table.Column<int>(type: "integer", nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportTransactionLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportTransactionLine_ImportTransaction_ImportTransactionId",
                        column: x => x.ImportTransactionId,
                        principalTable: "ImportTransaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportTransactionLine_Material_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Material",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialUsageRecord",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: true),
                    QuantityUsed = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    UsageDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialUsageRecord", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialUsageRecord_Material_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Material",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StockReportLine",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StockReportId = table.Column<int>(type: "integer", nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    MaterialName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    MaterialUnit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    QtyImported = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    QtyUsed = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    QtyOnHand = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    AvgUnitCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockReportLine", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockReportLine_StockReport_StockReportId",
                        column: x => x.StockReportId,
                        principalTable: "StockReport",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Expense_Category",
                table: "Expense",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Expense_ExpenseDate",
                table: "Expense",
                column: "ExpenseDate");

            migrationBuilder.CreateIndex(
                name: "IX_ImportTransaction_TransactionDate",
                table: "ImportTransaction",
                column: "TransactionDate");

            migrationBuilder.CreateIndex(
                name: "IX_ImportTransactionLine_ImportTransactionId",
                table: "ImportTransactionLine",
                column: "ImportTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportTransactionLine_MaterialId",
                table: "ImportTransactionLine",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_Material_Name",
                table: "Material",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Material_Sku",
                table: "Material",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialUsageRecord_MaterialId",
                table: "MaterialUsageRecord",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialUsageRecord_OrderId",
                table: "MaterialUsageRecord",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialUsageRecord_UsageDate",
                table: "MaterialUsageRecord",
                column: "UsageDate");

            migrationBuilder.CreateIndex(
                name: "IX_StockReport_SnapshotDate",
                table: "StockReport",
                column: "SnapshotDate");

            migrationBuilder.CreateIndex(
                name: "IX_StockReportLine_MaterialId",
                table: "StockReportLine",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_StockReportLine_StockReportId",
                table: "StockReportLine",
                column: "StockReportId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Expense");

            migrationBuilder.DropTable(
                name: "ImportTransactionLine");

            migrationBuilder.DropTable(
                name: "MaterialUsageRecord");

            migrationBuilder.DropTable(
                name: "StockReportLine");

            migrationBuilder.DropTable(
                name: "ImportTransaction");

            migrationBuilder.DropTable(
                name: "Material");

            migrationBuilder.DropTable(
                name: "StockReport");
        }
    }
}
