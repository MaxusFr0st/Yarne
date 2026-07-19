using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AccountingFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Product",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "Product",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "MarginThresholdPct",
                table: "Product",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 60m);

            migrationBuilder.AddColumn<string>(
                name: "SellingCurrencyCode",
                table: "Product",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "UAH");

            migrationBuilder.AddColumn<long>(
                name: "SellingPriceCents",
                table: "Product",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Product",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "OrderItem",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "OrderItem",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "ListedPriceCents",
                table: "OrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "NetPriceCents",
                table: "OrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "UnitCogsCents",
                table: "OrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<long>(
                name: "VatAmountCents",
                table: "OrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "ChannelFeeCents",
                table: "Order",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<int>(
                name: "ChannelId",
                table: "Order",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Order",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "Order",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "UAH");

            migrationBuilder.AddColumn<decimal>(
                name: "ExchangeRateToBase",
                table: "Order",
                type: "numeric(18,8)",
                precision: 18,
                scale: 8,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<bool>(
                name: "IsChannelFeeOverridden",
                table: "Order",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "Order",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Material",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedBy",
                table: "Material",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "Material",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ReorderThreshold",
                table: "Material",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Material",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateTable(
                name: "AccountingCurrency",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    MinorUnitDigits = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    IsBase = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountingCurrency", x => x.Code);
                });

            migrationBuilder.InsertData(
                table: "AccountingCurrency",
                columns: new[]
                {
                    "Code", "Name", "Symbol", "MinorUnitDigits", "IsBase", "IsActive",
                    "IsVoid", "CreatedAt", "UpdatedAt"
                },
                values: new object[,]
                {
                    { "UAH", "Ukrainian hryvnia", "₴", 2, true, true, false, DateTime.UtcNow, DateTime.UtcNow },
                    { "EUR", "Euro", "€", 2, false, true, false, DateTime.UtcNow, DateTime.UtcNow }
                });

            migrationBuilder.CreateTable(
                name: "FinishedGoodsInventory",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    QuantityOnHand = table.Column<int>(type: "integer", nullable: false),
                    AverageUnitCostCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinishedGoodsInventory", x => x.ProductId);
                    table.CheckConstraint("CK_FinishedGoodsInventory_Cost_NonNegative", "\"AverageUnitCostCents\" >= 0");
                    table.CheckConstraint("CK_FinishedGoodsInventory_Quantity_NonNegative", "\"QuantityOnHand\" >= 0");
                    table.ForeignKey(
                        name: "FK_FinishedGoodsInventory_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperatingExpenseCategory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperatingExpenseCategory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductionOrder",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    QuantityProduced = table.Column<int>(type: "integer", nullable: false),
                    QuantityRejected = table.Column<int>(type: "integer", nullable: false),
                    ProductionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalMaterialCostCents = table.Column<long>(type: "bigint", nullable: false),
                    TotalLabourCostCents = table.Column<long>(type: "bigint", nullable: false),
                    TotalCogsCents = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "draft"),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionOrder", x => x.Id);
                    table.CheckConstraint("CK_ProductionOrder_Costs_NonNegative", "\"TotalMaterialCostCents\" >= 0 AND \"TotalLabourCostCents\" >= 0 AND \"TotalCogsCents\" >= 0");
                    table.CheckConstraint("CK_ProductionOrder_Quantities", "\"QuantityProduced\" > 0 AND \"QuantityRejected\" >= 0 AND \"QuantityRejected\" <= \"QuantityProduced\"");
                    table.CheckConstraint("CK_ProductionOrder_Status", "\"Status\" IN ('draft', 'completed', 'cancelled')");
                    table.ForeignKey(
                        name: "FK_ProductionOrder_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Supplier",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContactInfo = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Supplier", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CurrencyExchangeRate",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FromCurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    ToCurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    EffectiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrencyExchangeRate", x => x.Id);
                    table.CheckConstraint("CK_CurrencyExchangeRate_DifferentCurrencies", "\"FromCurrencyCode\" <> \"ToCurrencyCode\"");
                    table.CheckConstraint("CK_CurrencyExchangeRate_Rate_Positive", "\"Rate\" > 0");
                    table.ForeignKey(
                        name: "FK_CurrencyExchangeRate_AccountingCurrency_FromCurrencyCode",
                        column: x => x.FromCurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CurrencyExchangeRate_AccountingCurrency_ToCurrencyCode",
                        column: x => x.ToCurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductBom",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    LabourCostCents = table.Column<long>(type: "bigint", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UAH"),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBom", x => x.Id);
                    table.CheckConstraint("CK_ProductBom_LabourCost_NonNegative", "\"LabourCostCents\" >= 0");
                    table.ForeignKey(
                        name: "FK_ProductBom_AccountingCurrency_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductBom_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReturnOrder",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SalesOrderId = table.Column<int>(type: "integer", nullable: false),
                    ReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Resolution = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RefundAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UAH"),
                    ExchangeRateToBase = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false, defaultValue: 1m),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "draft"),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnOrder", x => x.Id);
                    table.CheckConstraint("CK_ReturnOrder_ExchangeRate_Positive", "\"ExchangeRateToBase\" > 0");
                    table.CheckConstraint("CK_ReturnOrder_Reason", "\"Reason\" IN ('customer_request', 'defective', 'wrong_item', 'other')");
                    table.CheckConstraint("CK_ReturnOrder_Refund_NonNegative", "\"RefundAmountCents\" >= 0");
                    table.CheckConstraint("CK_ReturnOrder_Resolution", "\"Resolution\" IN ('restock', 'write_off')");
                    table.CheckConstraint("CK_ReturnOrder_Status", "\"Status\" IN ('draft', 'approved', 'completed', 'cancelled')");
                    table.ForeignKey(
                        name: "FK_ReturnOrder_AccountingCurrency_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnOrder_Order_SalesOrderId",
                        column: x => x.SalesOrderId,
                        principalTable: "Order",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesChannel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    FeeType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "none"),
                    FeePercentage = table.Column<decimal>(type: "numeric(7,4)", precision: 7, scale: 4, nullable: false),
                    FeeFlatCents = table.Column<long>(type: "bigint", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UAH"),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesChannel", x => x.Id);
                    table.CheckConstraint("CK_SalesChannel_Fees", "\"FeePercentage\" >= 0 AND \"FeePercentage\" <= 100 AND \"FeeFlatCents\" >= 0");
                    table.CheckConstraint("CK_SalesChannel_FeeType", "\"FeeType\" IN ('none', 'percentage', 'flat', 'percentage_plus_flat')");
                    table.ForeignKey(
                        name: "FK_SalesChannel_AccountingCurrency_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperatingExpense",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AmountCents = table.Column<long>(type: "bigint", nullable: false),
                    VatAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    BaseAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    BaseVatAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UAH"),
                    ExchangeRateToBase = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false, defaultValue: 1m),
                    Vendor = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReceiptUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "posted"),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperatingExpense", x => x.Id);
                    table.CheckConstraint("CK_OperatingExpense_ExchangeRate_Positive", "\"ExchangeRateToBase\" > 0");
                    table.CheckConstraint("CK_OperatingExpense_Money_NonNegative", "\"AmountCents\" >= 0 AND \"VatAmountCents\" >= 0 AND \"BaseAmountCents\" >= 0 AND \"BaseVatAmountCents\" >= 0");
                    table.CheckConstraint("CK_OperatingExpense_Status", "\"Status\" IN ('draft', 'posted', 'cancelled')");
                    table.ForeignKey(
                        name: "FK_OperatingExpense_AccountingCurrency_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperatingExpense_OperatingExpenseCategory_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "OperatingExpenseCategory",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrder",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierId = table.Column<int>(type: "integer", nullable: false),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InvoiceRef = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "draft"),
                    ReceiptUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    CurrencyCode = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "UAH"),
                    ExchangeRateToBase = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false, defaultValue: 1m),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrder", x => x.Id);
                    table.CheckConstraint("CK_PurchaseOrder_ExchangeRate_Positive", "\"ExchangeRateToBase\" > 0");
                    table.CheckConstraint("CK_PurchaseOrder_Status", "\"Status\" IN ('draft', 'received', 'cancelled')");
                    table.ForeignKey(
                        name: "FK_PurchaseOrder_AccountingCurrency_CurrencyCode",
                        column: x => x.CurrencyCode,
                        principalTable: "AccountingCurrency",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseOrder_Supplier_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Supplier",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductBomItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductBomId = table.Column<int>(type: "integer", nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    QuantityRequired = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductBomItem", x => x.Id);
                    table.CheckConstraint("CK_ProductBomItem_Quantity_Positive", "\"QuantityRequired\" > 0");
                    table.ForeignKey(
                        name: "FK_ProductBomItem_Material_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Material",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductBomItem_ProductBom_ProductBomId",
                        column: x => x.ProductBomId,
                        principalTable: "ProductBom",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReturnOrderItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReturnOrderId = table.Column<int>(type: "integer", nullable: false),
                    SalesOrderItemId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    RefundAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    VatReversedCents = table.Column<long>(type: "bigint", nullable: false),
                    CogsReversedCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnOrderItem", x => x.Id);
                    table.CheckConstraint("CK_ReturnOrderItem_Money_NonNegative", "\"RefundAmountCents\" >= 0 AND \"VatReversedCents\" >= 0 AND \"CogsReversedCents\" >= 0");
                    table.CheckConstraint("CK_ReturnOrderItem_Quantity_Positive", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_ReturnOrderItem_OrderItem_SalesOrderItemId",
                        column: x => x.SalesOrderItemId,
                        principalTable: "OrderItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReturnOrderItem_ReturnOrder_ReturnOrderId",
                        column: x => x.ReturnOrderId,
                        principalTable: "ReturnOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseOrderId = table.Column<int>(type: "integer", nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    QuantityPurchased = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitPriceCents = table.Column<long>(type: "bigint", nullable: false),
                    TotalCostCents = table.Column<long>(type: "bigint", nullable: false),
                    QuantityRemaining = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    VatAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    BaseUnitPriceCents = table.Column<long>(type: "bigint", nullable: false),
                    BaseTotalCostCents = table.Column<long>(type: "bigint", nullable: false),
                    BaseVatAmountCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderItem", x => x.Id);
                    table.CheckConstraint("CK_PurchaseOrderItem_Money_NonNegative", "\"UnitPriceCents\" >= 0 AND \"TotalCostCents\" >= 0 AND \"VatAmountCents\" >= 0 AND \"BaseUnitPriceCents\" >= 0 AND \"BaseTotalCostCents\" >= 0 AND \"BaseVatAmountCents\" >= 0");
                    table.CheckConstraint("CK_PurchaseOrderItem_QuantityPurchased_Positive", "\"QuantityPurchased\" > 0");
                    table.CheckConstraint("CK_PurchaseOrderItem_QuantityRemaining_Range", "\"QuantityRemaining\" >= 0 AND \"QuantityRemaining\" <= \"QuantityPurchased\"");
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItem_Material_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Material",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItem_PurchaseOrder_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductionMaterialConsumption",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductionOrderId = table.Column<int>(type: "integer", nullable: false),
                    PurchaseOrderItemId = table.Column<int>(type: "integer", nullable: false),
                    QuantityUsed = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitCostAtUseCents = table.Column<long>(type: "bigint", nullable: false),
                    TotalCostCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionMaterialConsumption", x => x.Id);
                    table.CheckConstraint("CK_ProductionMaterialConsumption_Cost_NonNegative", "\"UnitCostAtUseCents\" >= 0 AND \"TotalCostCents\" >= 0");
                    table.CheckConstraint("CK_ProductionMaterialConsumption_Quantity_Positive", "\"QuantityUsed\" > 0");
                    table.ForeignKey(
                        name: "FK_ProductionMaterialConsumption_ProductionOrder_ProductionOrd~",
                        column: x => x.ProductionOrderId,
                        principalTable: "ProductionOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductionMaterialConsumption_PurchaseOrderItem_PurchaseOrd~",
                        column: x => x.PurchaseOrderItemId,
                        principalTable: "PurchaseOrderItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Preserve the current storefront and V2 accounting history while moving to
            // integer minor units and explicit lot-based inventory.
            migrationBuilder.Sql(
                """
                UPDATE "Product"
                SET "SellingPriceCents" = ROUND("Price" * 100)::bigint,
                    "SellingCurrencyCode" = 'UAH',
                    "UpdatedAt" = CURRENT_TIMESTAMP;

                UPDATE "OrderItem"
                SET "ListedPriceCents" = ROUND("UnitPrice" * 100)::bigint,
                    "NetPriceCents" = ROUND("UnitPrice" * 100)::bigint,
                    "CreatedAt" = CURRENT_TIMESTAMP,
                    "UpdatedAt" = CURRENT_TIMESTAMP;

                INSERT INTO "FinishedGoodsInventory"
                    ("ProductId", "QuantityOnHand", "AverageUnitCostCents", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT "Id", GREATEST("QuantityInStock", 0), 0, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM "Product";

                INSERT INTO "SalesChannel"
                    ("Name", "FeeType", "FeePercentage", "FeeFlatCents", "CurrencyCode",
                     "IsVoid", "CreatedAt", "UpdatedAt")
                VALUES
                    ('Own store', 'none', 0, 0, 'UAH', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

                UPDATE "Order"
                SET "ChannelId" = (SELECT "Id" FROM "SalesChannel" WHERE "Name" = 'Own store' LIMIT 1),
                    "CurrencyCode" = 'UAH',
                    "ExchangeRateToBase" = 1,
                    "UpdatedAt" = CURRENT_TIMESTAMP;

                INSERT INTO "Supplier"
                    ("Name", "ContactInfo", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT DISTINCT
                    COALESCE(NULLIF(BTRIM("Supplier"), ''), 'Unknown supplier'),
                    NULL,
                    false,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM "ImportTransaction";

                INSERT INTO "PurchaseOrder"
                    ("Id", "SupplierId", "OrderDate", "InvoiceRef", "Status", "ReceiptUrl",
                     "CurrencyCode", "ExchangeRateToBase", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT
                    transaction."Id",
                    supplier."Id",
                    transaction."TransactionDate",
                    transaction."InvoiceRef",
                    CASE WHEN transaction."ReceivedDate" IS NULL THEN 'draft' ELSE 'received' END,
                    NULL,
                    'UAH',
                    1,
                    false,
                    transaction."CreatedAt",
                    CURRENT_TIMESTAMP
                FROM "ImportTransaction" transaction
                JOIN "Supplier" supplier
                  ON supplier."Name" = COALESCE(NULLIF(BTRIM(transaction."Supplier"), ''), 'Unknown supplier');

                WITH lot_usage AS (
                    SELECT
                        line."Id",
                        line."ImportTransactionId",
                        line."MaterialId",
                        line."Quantity",
                        line."UnitPrice",
                        COALESCE(
                            SUM(line."Quantity") OVER (
                                PARTITION BY line."MaterialId"
                                ORDER BY transaction."TransactionDate", line."Id"
                                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                            ),
                            0
                        ) AS prior_quantity,
                        COALESCE((
                            SELECT SUM(usage."QuantityUsed")
                            FROM "MaterialUsageRecord" usage
                            WHERE usage."MaterialId" = line."MaterialId"
                        ), 0) AS total_used
                    FROM "ImportTransactionLine" line
                    JOIN "ImportTransaction" transaction
                      ON transaction."Id" = line."ImportTransactionId"
                )
                INSERT INTO "PurchaseOrderItem"
                    ("Id", "PurchaseOrderId", "MaterialId", "QuantityPurchased",
                     "UnitPriceCents", "TotalCostCents", "QuantityRemaining",
                     "VatAmountCents", "BaseUnitPriceCents", "BaseTotalCostCents",
                     "BaseVatAmountCents", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT
                    "Id",
                    "ImportTransactionId",
                    "MaterialId",
                    "Quantity",
                    ROUND("UnitPrice" * 100)::bigint,
                    ROUND("Quantity" * "UnitPrice" * 100)::bigint,
                    GREATEST(
                        "Quantity" - GREATEST("total_used" - "prior_quantity", 0),
                        0
                    ),
                    0,
                    ROUND("UnitPrice" * 100)::bigint,
                    ROUND("Quantity" * "UnitPrice" * 100)::bigint,
                    0,
                    false,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM lot_usage;

                SELECT setval(
                    pg_get_serial_sequence('"PurchaseOrder"', 'Id'),
                    COALESCE((SELECT MAX("Id") FROM "PurchaseOrder"), 1),
                    EXISTS (SELECT 1 FROM "PurchaseOrder"));

                SELECT setval(
                    pg_get_serial_sequence('"PurchaseOrderItem"', 'Id'),
                    COALESCE((SELECT MAX("Id") FROM "PurchaseOrderItem"), 1),
                    EXISTS (SELECT 1 FROM "PurchaseOrderItem"));

                INSERT INTO "OperatingExpenseCategory"
                    ("Name", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT seed."Name", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM (VALUES
                    ('Marketing'), ('Equipment'), ('Rent'), ('Software'),
                    ('Packaging'), ('Shipping'), ('Other')
                ) AS seed("Name")
                WHERE NOT EXISTS (
                    SELECT 1 FROM "OperatingExpenseCategory" existing
                    WHERE existing."Name" = seed."Name"
                );

                INSERT INTO "OperatingExpenseCategory"
                    ("Name", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT DISTINCT category."Name", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM "ExpenseCategory" category
                WHERE BTRIM(category."Name") <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM "OperatingExpenseCategory" existing
                      WHERE existing."Name" = category."Name"
                  );

                INSERT INTO "OperatingExpenseCategory"
                    ("Name", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT DISTINCT expense."Category", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM "Expense" expense
                WHERE BTRIM(expense."Category") <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM "OperatingExpenseCategory" existing
                      WHERE existing."Name" = expense."Category"
                  );

                INSERT INTO "OperatingExpense"
                    ("CategoryId", "Date", "AmountCents", "VatAmountCents",
                     "BaseAmountCents", "BaseVatAmountCents", "CurrencyCode",
                     "ExchangeRateToBase", "Vendor", "Description", "PaymentMethod",
                     "ReceiptUrl", "Status", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT
                    category."Id",
                    expense."ExpenseDate",
                    ROUND(expense."Amount" * 100)::bigint,
                    0,
                    ROUND(expense."Amount" * 100)::bigint,
                    0,
                    'UAH',
                    1,
                    expense."Name",
                    CONCAT_WS(E'\n', NULLIF(expense."Description", ''), NULLIF(expense."Notes", '')),
                    NULL,
                    NULL,
                    'posted',
                    false,
                    expense."CreatedAt",
                    CURRENT_TIMESTAMP
                FROM "Expense" expense
                JOIN "OperatingExpenseCategory" category
                  ON category."Name" = expense."Category";

                INSERT INTO "OperatingExpense"
                    ("CategoryId", "Date", "AmountCents", "VatAmountCents",
                     "BaseAmountCents", "BaseVatAmountCents", "CurrencyCode",
                     "ExchangeRateToBase", "Vendor", "Description", "PaymentMethod",
                     "ReceiptUrl", "Status", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT
                    category."Id",
                    expense."ExpenseDate",
                    ROUND(expense."Amount" * 100)::bigint,
                    0,
                    ROUND(expense."Amount" * 100)::bigint,
                    0,
                    'UAH',
                    1,
                    expense."Name",
                    CONCAT_WS(E'\n', NULLIF(expense."Description", ''), NULLIF(expense."Notes", '')),
                    NULL,
                    NULL,
                    'posted',
                    false,
                    expense."CreatedAt",
                    CURRENT_TIMESTAMP
                FROM "MarketingExpenditure" expense
                JOIN "OperatingExpenseCategory" category
                  ON category."Name" = 'Marketing';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Product_SellingCurrencyCode",
                table: "Product",
                column: "SellingCurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_Order_ChannelId",
                table: "Order",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_Order_CurrencyCode",
                table: "Order",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingCurrency_CreatedBy",
                table: "AccountingCurrency",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AccountingCurrency_IsBase",
                table: "AccountingCurrency",
                column: "IsBase",
                unique: true,
                filter: "\"IsBase\" = true AND \"IsVoid\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_CurrencyExchangeRate_CreatedBy",
                table: "CurrencyExchangeRate",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CurrencyExchangeRate_FromCurrencyCode_ToCurrencyCode_Effect~",
                table: "CurrencyExchangeRate",
                columns: new[] { "FromCurrencyCode", "ToCurrencyCode", "EffectiveAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CurrencyExchangeRate_ToCurrencyCode",
                table: "CurrencyExchangeRate",
                column: "ToCurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsInventory_CreatedBy",
                table: "FinishedGoodsInventory",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpense_CategoryId",
                table: "OperatingExpense",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpense_CreatedBy",
                table: "OperatingExpense",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpense_CurrencyCode",
                table: "OperatingExpense",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpense_Date",
                table: "OperatingExpense",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpenseCategory_CreatedBy",
                table: "OperatingExpenseCategory",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_OperatingExpenseCategory_Name",
                table: "OperatingExpenseCategory",
                column: "Name",
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBom_CreatedBy",
                table: "ProductBom",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBom_CurrencyCode",
                table: "ProductBom",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBom_ProductId",
                table: "ProductBom",
                column: "ProductId",
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBomItem_CreatedBy",
                table: "ProductBomItem",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBomItem_MaterialId",
                table: "ProductBomItem",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductBomItem_ProductBomId_MaterialId",
                table: "ProductBomItem",
                columns: new[] { "ProductBomId", "MaterialId" },
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMaterialConsumption_CreatedBy",
                table: "ProductionMaterialConsumption",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMaterialConsumption_ProductionOrderId",
                table: "ProductionMaterialConsumption",
                column: "ProductionOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMaterialConsumption_PurchaseOrderItemId",
                table: "ProductionMaterialConsumption",
                column: "PurchaseOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOrder_CreatedBy",
                table: "ProductionOrder",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOrder_ProductId",
                table: "ProductionOrder",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionOrder_ProductionDate",
                table: "ProductionOrder",
                column: "ProductionDate");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_CreatedBy",
                table: "PurchaseOrder",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_CurrencyCode",
                table: "PurchaseOrder",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_OrderDate",
                table: "PurchaseOrder",
                column: "OrderDate");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrder_SupplierId",
                table: "PurchaseOrder",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItem_CreatedBy",
                table: "PurchaseOrderItem",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItem_MaterialId_Id",
                table: "PurchaseOrderItem",
                columns: new[] { "MaterialId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItem_PurchaseOrderId",
                table: "PurchaseOrderItem",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrder_CreatedBy",
                table: "ReturnOrder",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrder_CurrencyCode",
                table: "ReturnOrder",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrder_ReturnDate",
                table: "ReturnOrder",
                column: "ReturnDate");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrder_SalesOrderId",
                table: "ReturnOrder",
                column: "SalesOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrderItem_CreatedBy",
                table: "ReturnOrderItem",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrderItem_ReturnOrderId",
                table: "ReturnOrderItem",
                column: "ReturnOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnOrderItem_SalesOrderItemId",
                table: "ReturnOrderItem",
                column: "SalesOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesChannel_CreatedBy",
                table: "SalesChannel",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SalesChannel_CurrencyCode",
                table: "SalesChannel",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_SalesChannel_Name",
                table: "SalesChannel",
                column: "Name",
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Supplier_CreatedBy",
                table: "Supplier",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Supplier_Name",
                table: "Supplier",
                column: "Name",
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_Order_AccountingCurrency_CurrencyCode",
                table: "Order",
                column: "CurrencyCode",
                principalTable: "AccountingCurrency",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Order_SalesChannel_ChannelId",
                table: "Order",
                column: "ChannelId",
                principalTable: "SalesChannel",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Product_AccountingCurrency_SellingCurrencyCode",
                table: "Product",
                column: "SellingCurrencyCode",
                principalTable: "AccountingCurrency",
                principalColumn: "Code",
                onDelete: ReferentialAction.Restrict);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Order_AccountingCurrency_CurrencyCode",
                table: "Order");

            migrationBuilder.DropForeignKey(
                name: "FK_Order_SalesChannel_ChannelId",
                table: "Order");

            migrationBuilder.DropForeignKey(
                name: "FK_Product_AccountingCurrency_SellingCurrencyCode",
                table: "Product");

            migrationBuilder.DropTable(
                name: "CurrencyExchangeRate");

            migrationBuilder.DropTable(
                name: "FinishedGoodsInventory");

            migrationBuilder.DropTable(
                name: "OperatingExpense");

            migrationBuilder.DropTable(
                name: "ProductBomItem");

            migrationBuilder.DropTable(
                name: "ProductionMaterialConsumption");

            migrationBuilder.DropTable(
                name: "ReturnOrderItem");

            migrationBuilder.DropTable(
                name: "SalesChannel");

            migrationBuilder.DropTable(
                name: "OperatingExpenseCategory");

            migrationBuilder.DropTable(
                name: "ProductBom");

            migrationBuilder.DropTable(
                name: "ProductionOrder");

            migrationBuilder.DropTable(
                name: "PurchaseOrderItem");

            migrationBuilder.DropTable(
                name: "ReturnOrder");

            migrationBuilder.DropTable(
                name: "PurchaseOrder");

            migrationBuilder.DropTable(
                name: "AccountingCurrency");

            migrationBuilder.DropTable(
                name: "Supplier");

            migrationBuilder.DropIndex(
                name: "IX_Product_SellingCurrencyCode",
                table: "Product");

            migrationBuilder.DropIndex(
                name: "IX_Order_ChannelId",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_CurrencyCode",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "MarginThresholdPct",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "SellingCurrencyCode",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "SellingPriceCents",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ListedPriceCents",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "NetPriceCents",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "UnitCogsCents",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "VatAmountCents",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ChannelFeeCents",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ChannelId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ExchangeRateToBase",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "IsChannelFeeOverridden",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Material");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Material");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "Material");

            migrationBuilder.DropColumn(
                name: "ReorderThreshold",
                table: "Material");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Material");

        }
    }
}
