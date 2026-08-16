using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RestoreAccountingModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Product",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<long>(
                name: "SellingPriceCents",
                table: "Product",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "SellingCurrencyCode",
                table: "Product",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "UAH",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "MarginThresholdPct",
                table: "Product",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 60m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "Product",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "OrderItem",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "Order",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<decimal>(
                name: "ExchangeRateToBase",
                table: "Order",
                type: "numeric(18,8)",
                precision: 18,
                scale: 8,
                nullable: false,
                defaultValue: 1m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "CurrencyCode",
                table: "Order",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "UAH",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            // The accounting module previously lived on main and was removed by commit cd8e8a41,
            // but that removal only dropped Color.LaceProductId — these ~24 tables, their indexes,
            // and the 4 constraints added to the pre-existing Order/OrderItem/Product tables were
            // never dropped from the database. This block restores them idempotently (IF NOT EXISTS /
            // guarded DO blocks) so it's safe to apply whether or not the objects already physically exist.
            migrationBuilder.Sql(RestoreAccountingSchemaSql);
        }

        private const string RestoreAccountingSchemaSql = """
            CREATE TABLE IF NOT EXISTS "AccountingCategory" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(150) NOT NULL,
                "Description" character varying(500),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_AccountingCategory" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "AccountingCurrency" (
                "Code" character varying(3) NOT NULL,
                "Name" character varying(80) NOT NULL,
                "Symbol" character varying(8) NOT NULL,
                "MinorUnitDigits" integer NOT NULL DEFAULT 2,
                "IsBase" boolean NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_AccountingCurrency" PRIMARY KEY ("Code")
            );

            CREATE TABLE IF NOT EXISTS "Expense" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Category" character varying(100) NOT NULL,
                "Name" character varying(255) NOT NULL,
                "Description" character varying(1000),
                "Amount" numeric(18,2) NOT NULL,
                "ExpenseDate" timestamp with time zone NOT NULL,
                "Notes" character varying(1000),
                "IsVoid" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_Expense" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(100) NOT NULL,
                "Description" character varying(500),
                "IsVoid" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ExpenseCategory" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "ExternalOrder" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Label" character varying(255),
                "CustomerName" character varying(255),
                "OrderDate" timestamp with time zone NOT NULL,
                "Notes" character varying(1000),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ExternalOrder" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "FinishedGoodsInventory" (
                "ProductId" integer NOT NULL,
                "QuantityOnHand" integer NOT NULL,
                "AverageUnitCostCents" bigint NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_FinishedGoodsInventory" PRIMARY KEY ("ProductId"),
                CONSTRAINT "CK_FinishedGoodsInventory_Cost_NonNegative" CHECK ("AverageUnitCostCents" >= 0),
                CONSTRAINT "CK_FinishedGoodsInventory_Quantity_NonNegative" CHECK ("QuantityOnHand" >= 0),
                CONSTRAINT "FK_FinishedGoodsInventory_Product_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ImportTransaction" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Supplier" character varying(255),
                "TransactionDate" timestamp with time zone NOT NULL,
                "ReceivedDate" timestamp with time zone,
                "Notes" character varying(1000),
                "InvoiceRef" character varying(150),
                "IsLocked" boolean NOT NULL DEFAULT FALSE,
                "IsVoid" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ImportTransaction" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "MarketingExpenditure" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(255) NOT NULL,
                "Description" character varying(1000),
                "Amount" numeric(18,2) NOT NULL,
                "ExpenseDate" timestamp with time zone NOT NULL,
                "Notes" character varying(1000),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_MarketingExpenditure" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "Material" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(255) NOT NULL,
                "Description" character varying(1000),
                "Unit" character varying(50) NOT NULL DEFAULT 'pcs',
                "Sku" character varying(100),
                "Category" character varying(100),
                "ReorderThreshold" numeric(18,4) NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "TrackByItem" boolean NOT NULL DEFAULT FALSE,
                "DefaultLengthPerItem" numeric(18,4),
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_Material" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "OperatingExpenseCategory" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(100) NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_OperatingExpenseCategory" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "ProductionOrder" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ProductId" integer NOT NULL,
                "QuantityProduced" integer NOT NULL,
                "QuantityRejected" integer NOT NULL,
                "ProductionDate" timestamp with time zone NOT NULL,
                "TotalMaterialCostCents" bigint NOT NULL,
                "TotalLabourCostCents" bigint NOT NULL,
                "TotalCogsCents" bigint NOT NULL,
                "CapitalizedCogsCents" bigint NOT NULL,
                "ScrapCostCents" bigint NOT NULL,
                "Status" character varying(20) NOT NULL DEFAULT 'draft',
                "Notes" character varying(2000),
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ProductionOrder" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ProductionOrder_Costs_NonNegative" CHECK ("TotalMaterialCostCents" >= 0 AND "TotalLabourCostCents" >= 0 AND "TotalCogsCents" >= 0),
                CONSTRAINT "CK_ProductionOrder_Quantities" CHECK ("QuantityProduced" > 0 AND "QuantityRejected" >= 0 AND "QuantityRejected" <= "QuantityProduced"),
                CONSTRAINT "CK_ProductionOrder_Status" CHECK ("Status" IN ('draft', 'completed', 'cancelled')),
                CONSTRAINT "FK_ProductionOrder_Product_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "StockReport" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "SnapshotDate" timestamp with time zone NOT NULL,
                "Label" character varying(255),
                "Notes" character varying(1000),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "IsLocked" boolean NOT NULL DEFAULT TRUE,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                CONSTRAINT "PK_StockReport" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "Supplier" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(255) NOT NULL,
                "ContactInfo" character varying(1000),
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_Supplier" PRIMARY KEY ("Id")
            );

            CREATE TABLE IF NOT EXISTS "AccountingPurchase" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "CategoryId" integer NOT NULL,
                "Name" character varying(255) NOT NULL,
                "Description" character varying(1000),
                "Supplier" character varying(255),
                "PurchaseDate" timestamp with time zone NOT NULL,
                "ReceivedDate" timestamp with time zone,
                "SoldDate" timestamp with time zone,
                "Quantity" integer NOT NULL,
                "QuantitySold" integer NOT NULL,
                "UnitCost" numeric(18,2) NOT NULL,
                "SaleUnitPrice" numeric(18,2),
                "Notes" character varying(1000),
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_AccountingPurchase" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_AccountingPurchase_AccountingCategory_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "AccountingCategory" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "CurrencyExchangeRate" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "FromCurrencyCode" character varying(3) NOT NULL,
                "ToCurrencyCode" character varying(3) NOT NULL,
                "Rate" numeric(18,8) NOT NULL,
                "EffectiveAt" timestamp with time zone NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_CurrencyExchangeRate" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_CurrencyExchangeRate_DifferentCurrencies" CHECK ("FromCurrencyCode" <> "ToCurrencyCode"),
                CONSTRAINT "CK_CurrencyExchangeRate_Rate_Positive" CHECK ("Rate" > 0),
                CONSTRAINT "FK_CurrencyExchangeRate_AccountingCurrency_FromCurrencyCode" FOREIGN KEY ("FromCurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT,
                CONSTRAINT "FK_CurrencyExchangeRate_AccountingCurrency_ToCurrencyCode" FOREIGN KEY ("ToCurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ProductBom" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ProductId" integer NOT NULL,
                "LabourCostCents" bigint NOT NULL,
                "CurrencyCode" character varying(3) NOT NULL DEFAULT 'UAH',
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ProductBom" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ProductBom_LabourCost_NonNegative" CHECK ("LabourCostCents" >= 0),
                CONSTRAINT "FK_ProductBom_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT,
                CONSTRAINT "FK_ProductBom_Product_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ReturnOrder" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "SalesOrderId" integer NOT NULL,
                "ReturnDate" timestamp with time zone NOT NULL,
                "Reason" character varying(30) NOT NULL,
                "Resolution" character varying(20) NOT NULL,
                "RefundAmountCents" bigint NOT NULL,
                "CurrencyCode" character varying(3) NOT NULL DEFAULT 'UAH',
                "ExchangeRateToBase" numeric(18,8) NOT NULL DEFAULT 1.0,
                "Status" character varying(20) NOT NULL DEFAULT 'draft',
                "Notes" character varying(2000),
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ReturnOrder" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ReturnOrder_ExchangeRate_Positive" CHECK ("ExchangeRateToBase" > 0),
                CONSTRAINT "CK_ReturnOrder_Reason" CHECK ("Reason" IN ('customer_request', 'defective', 'wrong_item', 'other')),
                CONSTRAINT "CK_ReturnOrder_Refund_NonNegative" CHECK ("RefundAmountCents" >= 0),
                CONSTRAINT "CK_ReturnOrder_Resolution" CHECK ("Resolution" IN ('restock', 'reclaim_materials', 'write_off')),
                CONSTRAINT "CK_ReturnOrder_Status" CHECK ("Status" IN ('draft', 'approved', 'completed', 'cancelled')),
                CONSTRAINT "FK_ReturnOrder_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT,
                CONSTRAINT "FK_ReturnOrder_Order_SalesOrderId" FOREIGN KEY ("SalesOrderId") REFERENCES "Order" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "SalesChannel" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "Name" character varying(150) NOT NULL,
                "NameUk" character varying(150),
                "FeeType" character varying(30) NOT NULL DEFAULT 'none',
                "FeePercentage" numeric(7,4) NOT NULL,
                "FeeFlatCents" bigint NOT NULL,
                "CurrencyCode" character varying(3) NOT NULL DEFAULT 'UAH',
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_SalesChannel" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_SalesChannel_Fees" CHECK ("FeePercentage" >= 0 AND "FeePercentage" <= 100 AND "FeeFlatCents" >= 0),
                CONSTRAINT "CK_SalesChannel_FeeType" CHECK ("FeeType" IN ('none', 'percentage', 'flat', 'percentage_plus_flat')),
                CONSTRAINT "FK_SalesChannel_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ImportTransactionLine" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ImportTransactionId" integer NOT NULL,
                "MaterialId" integer NOT NULL,
                "Quantity" numeric(18,4) NOT NULL,
                "UnitPrice" numeric(18,2) NOT NULL,
                "IsVoid" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ImportTransactionLine" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_ImportTransactionLine_ImportTransaction_ImportTransactionId" FOREIGN KEY ("ImportTransactionId") REFERENCES "ImportTransaction" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_ImportTransactionLine_Material_MaterialId" FOREIGN KEY ("MaterialId") REFERENCES "Material" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "MaterialUsageRecord" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "MaterialId" integer NOT NULL,
                "OrderId" integer,
                "ExternalOrderId" integer,
                "QuantityUsed" numeric(18,4) NOT NULL,
                "UsageDate" timestamp with time zone NOT NULL,
                "Notes" character varying(1000),
                "IsVoid" boolean NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_MaterialUsageRecord" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_MaterialUsageRecord_ExternalOrder_ExternalOrderId" FOREIGN KEY ("ExternalOrderId") REFERENCES "ExternalOrder" ("Id") ON DELETE SET NULL,
                CONSTRAINT "FK_MaterialUsageRecord_Material_MaterialId" FOREIGN KEY ("MaterialId") REFERENCES "Material" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "OperatingExpense" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "CategoryId" integer NOT NULL,
                "Date" timestamp with time zone NOT NULL,
                "AmountCents" bigint NOT NULL,
                "VatAmountCents" bigint NOT NULL,
                "BaseAmountCents" bigint NOT NULL,
                "BaseVatAmountCents" bigint NOT NULL,
                "CurrencyCode" character varying(3) NOT NULL DEFAULT 'UAH',
                "ExchangeRateToBase" numeric(18,8) NOT NULL DEFAULT 1.0,
                "Vendor" character varying(255),
                "Description" character varying(2000),
                "PaymentMethod" character varying(100),
                "ReceiptUrl" character varying(2048),
                "Status" character varying(20) NOT NULL DEFAULT 'posted',
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_OperatingExpense" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_OperatingExpense_ExchangeRate_Positive" CHECK ("ExchangeRateToBase" > 0),
                CONSTRAINT "CK_OperatingExpense_Money_NonNegative" CHECK ("AmountCents" >= 0 AND "VatAmountCents" >= 0 AND "BaseAmountCents" >= 0 AND "BaseVatAmountCents" >= 0),
                CONSTRAINT "CK_OperatingExpense_Status" CHECK ("Status" IN ('draft', 'posted', 'cancelled')),
                CONSTRAINT "FK_OperatingExpense_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT,
                CONSTRAINT "FK_OperatingExpense_OperatingExpenseCategory_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "OperatingExpenseCategory" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "FinishedGoodsLot" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ProductId" integer NOT NULL,
                "ProductionOrderId" integer NOT NULL,
                "QuantityProduced" integer NOT NULL,
                "QuantityRemaining" integer NOT NULL,
                "UnitCostCents" bigint NOT NULL,
                "ColorId" integer,
                "SizeId" integer,
                "Lace" boolean NOT NULL DEFAULT FALSE,
                "AppliedToStorefrontQuantity" integer NOT NULL DEFAULT 0,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_FinishedGoodsLot" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_FinishedGoodsLot_Applied_Range" CHECK ("AppliedToStorefrontQuantity" >= 0 AND "AppliedToStorefrontQuantity" <= "QuantityProduced"),
                CONSTRAINT "CK_FinishedGoodsLot_Cost_NonNegative" CHECK ("UnitCostCents" >= 0),
                CONSTRAINT "CK_FinishedGoodsLot_Quantity_Positive" CHECK ("QuantityProduced" > 0),
                CONSTRAINT "CK_FinishedGoodsLot_QuantityRemaining_Range" CHECK ("QuantityRemaining" >= 0 AND "QuantityRemaining" <= "QuantityProduced"),
                CONSTRAINT "FK_FinishedGoodsLot_Color_ColorId" FOREIGN KEY ("ColorId") REFERENCES "Color" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_FinishedGoodsLot_Product_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_FinishedGoodsLot_ProductionOrder_ProductionOrderId" FOREIGN KEY ("ProductionOrderId") REFERENCES "ProductionOrder" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_FinishedGoodsLot_Size_SizeId" FOREIGN KEY ("SizeId") REFERENCES "Size" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "StockReportLine" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "StockReportId" integer NOT NULL,
                "MaterialId" integer NOT NULL,
                "MaterialName" character varying(255) NOT NULL,
                "MaterialUnit" character varying(50) NOT NULL,
                "QtyImported" numeric(18,4) NOT NULL,
                "QtyUsed" numeric(18,4) NOT NULL,
                "QtyOnHand" numeric(18,4) NOT NULL,
                "AvgUnitCost" numeric(18,2) NOT NULL,
                "TotalValue" numeric(18,2) NOT NULL,
                CONSTRAINT "PK_StockReportLine" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_StockReportLine_StockReport_StockReportId" FOREIGN KEY ("StockReportId") REFERENCES "StockReport" ("Id") ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "SupplierId" integer NOT NULL,
                "OrderDate" timestamp with time zone NOT NULL,
                "InvoiceRef" character varying(150),
                "Status" character varying(20) NOT NULL DEFAULT 'draft',
                "ReceiptUrl" character varying(2048),
                "CurrencyCode" character varying(3) NOT NULL DEFAULT 'UAH',
                "ExchangeRateToBase" numeric(18,8) NOT NULL DEFAULT 1.0,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_PurchaseOrder" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_PurchaseOrder_ExchangeRate_Positive" CHECK ("ExchangeRateToBase" > 0),
                CONSTRAINT "CK_PurchaseOrder_Status" CHECK ("Status" IN ('draft', 'received', 'cancelled')),
                CONSTRAINT "FK_PurchaseOrder_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT,
                CONSTRAINT "FK_PurchaseOrder_Supplier_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Supplier" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ProductBomItem" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ProductBomId" integer NOT NULL,
                "MaterialId" integer NOT NULL,
                "QuantityRequired" numeric(18,4) NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ProductBomItem" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ProductBomItem_Quantity_Positive" CHECK ("QuantityRequired" > 0),
                CONSTRAINT "FK_ProductBomItem_Material_MaterialId" FOREIGN KEY ("MaterialId") REFERENCES "Material" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_ProductBomItem_ProductBom_ProductBomId" FOREIGN KEY ("ProductBomId") REFERENCES "ProductBom" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ReturnOrderItem" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ReturnOrderId" integer NOT NULL,
                "SalesOrderItemId" integer NOT NULL,
                "Quantity" integer NOT NULL,
                "RefundAmountCents" bigint NOT NULL,
                "VatReversedCents" bigint NOT NULL,
                "CogsReversedCents" bigint NOT NULL,
                "FeeReversedCents" bigint NOT NULL,
                "MaterialsReclaimedCents" bigint NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ReturnOrderItem" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ReturnOrderItem_Money_NonNegative" CHECK ("RefundAmountCents" >= 0 AND "VatReversedCents" >= 0 AND "CogsReversedCents" >= 0 AND "FeeReversedCents" >= 0 AND "MaterialsReclaimedCents" >= 0),
                CONSTRAINT "CK_ReturnOrderItem_Quantity_Positive" CHECK ("Quantity" > 0),
                CONSTRAINT "FK_ReturnOrderItem_OrderItem_SalesOrderItemId" FOREIGN KEY ("SalesOrderItemId") REFERENCES "OrderItem" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_ReturnOrderItem_ReturnOrder_ReturnOrderId" FOREIGN KEY ("ReturnOrderId") REFERENCES "ReturnOrder" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "SalesFinishedGoodsConsumption" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "SalesOrderItemId" integer NOT NULL,
                "FinishedGoodsLotId" integer NOT NULL,
                "Quantity" integer NOT NULL,
                "UnitCostAtSaleCents" bigint NOT NULL,
                "TotalCostCents" bigint NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_SalesFinishedGoodsConsumption" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_SalesFinishedGoodsConsumption_Cost_NonNegative" CHECK ("UnitCostAtSaleCents" >= 0 AND "TotalCostCents" >= 0),
                CONSTRAINT "CK_SalesFinishedGoodsConsumption_Quantity_Positive" CHECK ("Quantity" > 0),
                CONSTRAINT "FK_SalesFinishedGoodsConsumption_FinishedGoodsLot_FinishedGood~" FOREIGN KEY ("FinishedGoodsLotId") REFERENCES "FinishedGoodsLot" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_SalesFinishedGoodsConsumption_OrderItem_SalesOrderItemId" FOREIGN KEY ("SalesOrderItemId") REFERENCES "OrderItem" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "PurchaseOrderId" integer NOT NULL,
                "MaterialId" integer NOT NULL,
                "QuantityPurchased" numeric(18,4) NOT NULL,
                "UnitPriceCents" bigint NOT NULL,
                "TotalCostCents" bigint NOT NULL,
                "QuantityRemaining" numeric(18,4) NOT NULL,
                "ItemCount" integer,
                "LengthPerItem" numeric(18,4),
                "RollPriceCents" bigint,
                "VatAmountCents" bigint NOT NULL,
                "BaseUnitPriceCents" bigint NOT NULL,
                "BaseTotalCostCents" bigint NOT NULL,
                "BaseVatAmountCents" bigint NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_PurchaseOrderItem" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_PurchaseOrderItem_ItemShape" CHECK (("ItemCount" IS NULL AND "LengthPerItem" IS NULL) OR ("ItemCount" > 0 AND "LengthPerItem" > 0)),
                CONSTRAINT "CK_PurchaseOrderItem_Money_NonNegative" CHECK ("UnitPriceCents" >= 0 AND "TotalCostCents" >= 0 AND "VatAmountCents" >= 0 AND "BaseUnitPriceCents" >= 0 AND "BaseTotalCostCents" >= 0 AND "BaseVatAmountCents" >= 0),
                CONSTRAINT "CK_PurchaseOrderItem_QuantityPurchased_Positive" CHECK ("QuantityPurchased" > 0),
                CONSTRAINT "CK_PurchaseOrderItem_QuantityRemaining_Range" CHECK ("QuantityRemaining" >= 0 AND "QuantityRemaining" <= "QuantityPurchased"),
                CONSTRAINT "FK_PurchaseOrderItem_Material_MaterialId" FOREIGN KEY ("MaterialId") REFERENCES "Material" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_PurchaseOrderItem_PurchaseOrder_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrder" ("Id") ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS "ProductionMaterialConsumption" (
                "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                "ProductionOrderId" integer NOT NULL,
                "PurchaseOrderItemId" integer NOT NULL,
                "QuantityUsed" numeric(18,4) NOT NULL,
                "UnitCostAtUseCents" bigint NOT NULL,
                "TotalCostCents" bigint NOT NULL,
                "IsVoid" boolean NOT NULL DEFAULT FALSE,
                "CreatedBy" integer,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "PK_ProductionMaterialConsumption" PRIMARY KEY ("Id"),
                CONSTRAINT "CK_ProductionMaterialConsumption_Cost_NonNegative" CHECK ("UnitCostAtUseCents" >= 0 AND "TotalCostCents" >= 0),
                CONSTRAINT "CK_ProductionMaterialConsumption_Quantity_Positive" CHECK ("QuantityUsed" > 0),
                CONSTRAINT "FK_ProductionMaterialConsumption_ProductionOrder_ProductionOrd~" FOREIGN KEY ("ProductionOrderId") REFERENCES "ProductionOrder" ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_ProductionMaterialConsumption_PurchaseOrderItem_PurchaseOrd~" FOREIGN KEY ("PurchaseOrderItemId") REFERENCES "PurchaseOrderItem" ("Id") ON DELETE RESTRICT
            );

            CREATE INDEX IF NOT EXISTS "IX_Product_SellingCurrencyCode" ON "Product" ("SellingCurrencyCode");

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_OrderItem_AccountingMoney_NonNegative') THEN
                    ALTER TABLE "OrderItem" ADD CONSTRAINT "CK_OrderItem_AccountingMoney_NonNegative" CHECK ("ListedPriceCents" >= 0 AND "NetPriceCents" >= 0 AND "ChannelFeeShareCents" >= 0 AND "UnitCogsCents" >= 0 AND "VatAmountCents" >= 0);
                END IF;
            END $$;

            CREATE INDEX IF NOT EXISTS "IX_Order_ChannelId" ON "Order" ("ChannelId");
            CREATE INDEX IF NOT EXISTS "IX_Order_CurrencyCode" ON "Order" ("CurrencyCode");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_AccountingCategory_Name" ON "AccountingCategory" ("Name");
            CREATE INDEX IF NOT EXISTS "IX_AccountingCurrency_CreatedBy" ON "AccountingCurrency" ("CreatedBy");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_AccountingCurrency_IsBase" ON "AccountingCurrency" ("IsBase") WHERE "IsBase" = true AND "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_AccountingPurchase_CategoryId" ON "AccountingPurchase" ("CategoryId");
            CREATE INDEX IF NOT EXISTS "IX_AccountingPurchase_PurchaseDate" ON "AccountingPurchase" ("PurchaseDate");
            CREATE INDEX IF NOT EXISTS "IX_CurrencyExchangeRate_CreatedBy" ON "CurrencyExchangeRate" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_CurrencyExchangeRate_FromCurrencyCode_ToCurrencyCode_Effect~" ON "CurrencyExchangeRate" ("FromCurrencyCode", "ToCurrencyCode", "EffectiveAt");
            CREATE INDEX IF NOT EXISTS "IX_CurrencyExchangeRate_ToCurrencyCode" ON "CurrencyExchangeRate" ("ToCurrencyCode");
            CREATE INDEX IF NOT EXISTS "IX_Expense_Category" ON "Expense" ("Category");
            CREATE INDEX IF NOT EXISTS "IX_Expense_ExpenseDate" ON "Expense" ("ExpenseDate");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ExpenseCategory_Name" ON "ExpenseCategory" ("Name") WHERE "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_ExternalOrder_OrderDate" ON "ExternalOrder" ("OrderDate");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsInventory_CreatedBy" ON "FinishedGoodsInventory" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsLot_ColorId" ON "FinishedGoodsLot" ("ColorId");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsLot_CreatedBy" ON "FinishedGoodsLot" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsLot_ProductId_Id" ON "FinishedGoodsLot" ("ProductId", "Id");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsLot_ProductionOrderId" ON "FinishedGoodsLot" ("ProductionOrderId");
            CREATE INDEX IF NOT EXISTS "IX_FinishedGoodsLot_SizeId" ON "FinishedGoodsLot" ("SizeId");
            CREATE INDEX IF NOT EXISTS "IX_ImportTransaction_TransactionDate" ON "ImportTransaction" ("TransactionDate");
            CREATE INDEX IF NOT EXISTS "IX_ImportTransactionLine_ImportTransactionId" ON "ImportTransactionLine" ("ImportTransactionId");
            CREATE INDEX IF NOT EXISTS "IX_ImportTransactionLine_MaterialId" ON "ImportTransactionLine" ("MaterialId");
            CREATE INDEX IF NOT EXISTS "IX_MarketingExpenditure_ExpenseDate" ON "MarketingExpenditure" ("ExpenseDate");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Material_Name" ON "Material" ("Name");
            CREATE INDEX IF NOT EXISTS "IX_Material_Sku" ON "Material" ("Sku");
            CREATE INDEX IF NOT EXISTS "IX_MaterialUsageRecord_ExternalOrderId" ON "MaterialUsageRecord" ("ExternalOrderId");
            CREATE INDEX IF NOT EXISTS "IX_MaterialUsageRecord_MaterialId" ON "MaterialUsageRecord" ("MaterialId");
            CREATE INDEX IF NOT EXISTS "IX_MaterialUsageRecord_OrderId" ON "MaterialUsageRecord" ("OrderId");
            CREATE INDEX IF NOT EXISTS "IX_MaterialUsageRecord_UsageDate" ON "MaterialUsageRecord" ("UsageDate");
            CREATE INDEX IF NOT EXISTS "IX_OperatingExpense_CategoryId" ON "OperatingExpense" ("CategoryId");
            CREATE INDEX IF NOT EXISTS "IX_OperatingExpense_CreatedBy" ON "OperatingExpense" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_OperatingExpense_CurrencyCode" ON "OperatingExpense" ("CurrencyCode");
            CREATE INDEX IF NOT EXISTS "IX_OperatingExpense_Date" ON "OperatingExpense" ("Date");
            CREATE INDEX IF NOT EXISTS "IX_OperatingExpenseCategory_CreatedBy" ON "OperatingExpenseCategory" ("CreatedBy");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OperatingExpenseCategory_Name" ON "OperatingExpenseCategory" ("Name") WHERE "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_ProductBom_CreatedBy" ON "ProductBom" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ProductBom_CurrencyCode" ON "ProductBom" ("CurrencyCode");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProductBom_ProductId" ON "ProductBom" ("ProductId") WHERE "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_ProductBomItem_CreatedBy" ON "ProductBomItem" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ProductBomItem_MaterialId" ON "ProductBomItem" ("MaterialId");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProductBomItem_ProductBomId_MaterialId" ON "ProductBomItem" ("ProductBomId", "MaterialId") WHERE "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_ProductionMaterialConsumption_CreatedBy" ON "ProductionMaterialConsumption" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ProductionMaterialConsumption_ProductionOrderId" ON "ProductionMaterialConsumption" ("ProductionOrderId");
            CREATE INDEX IF NOT EXISTS "IX_ProductionMaterialConsumption_PurchaseOrderItemId" ON "ProductionMaterialConsumption" ("PurchaseOrderItemId");
            CREATE INDEX IF NOT EXISTS "IX_ProductionOrder_CreatedBy" ON "ProductionOrder" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ProductionOrder_ProductId" ON "ProductionOrder" ("ProductId");
            CREATE INDEX IF NOT EXISTS "IX_ProductionOrder_ProductionDate" ON "ProductionOrder" ("ProductionDate");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrder_CreatedBy" ON "PurchaseOrder" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrder_CurrencyCode" ON "PurchaseOrder" ("CurrencyCode");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrder_OrderDate" ON "PurchaseOrder" ("OrderDate");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrder_SupplierId" ON "PurchaseOrder" ("SupplierId");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrderItem_CreatedBy" ON "PurchaseOrderItem" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrderItem_MaterialId_Id" ON "PurchaseOrderItem" ("MaterialId", "Id");
            CREATE INDEX IF NOT EXISTS "IX_PurchaseOrderItem_PurchaseOrderId" ON "PurchaseOrderItem" ("PurchaseOrderId");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrder_CreatedBy" ON "ReturnOrder" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrder_CurrencyCode" ON "ReturnOrder" ("CurrencyCode");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrder_ReturnDate" ON "ReturnOrder" ("ReturnDate");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrder_SalesOrderId" ON "ReturnOrder" ("SalesOrderId");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrderItem_CreatedBy" ON "ReturnOrderItem" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrderItem_ReturnOrderId" ON "ReturnOrderItem" ("ReturnOrderId");
            CREATE INDEX IF NOT EXISTS "IX_ReturnOrderItem_SalesOrderItemId" ON "ReturnOrderItem" ("SalesOrderItemId");
            CREATE INDEX IF NOT EXISTS "IX_SalesChannel_CreatedBy" ON "SalesChannel" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_SalesChannel_CurrencyCode" ON "SalesChannel" ("CurrencyCode");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesChannel_Name" ON "SalesChannel" ("Name") WHERE "IsVoid" = false;
            CREATE INDEX IF NOT EXISTS "IX_SalesFinishedGoodsConsumption_CreatedBy" ON "SalesFinishedGoodsConsumption" ("CreatedBy");
            CREATE INDEX IF NOT EXISTS "IX_SalesFinishedGoodsConsumption_FinishedGoodsLotId" ON "SalesFinishedGoodsConsumption" ("FinishedGoodsLotId");
            CREATE INDEX IF NOT EXISTS "IX_SalesFinishedGoodsConsumption_SalesOrderItemId" ON "SalesFinishedGoodsConsumption" ("SalesOrderItemId");
            CREATE INDEX IF NOT EXISTS "IX_StockReport_IsVoid" ON "StockReport" ("IsVoid");
            CREATE INDEX IF NOT EXISTS "IX_StockReport_SnapshotDate" ON "StockReport" ("SnapshotDate");
            CREATE INDEX IF NOT EXISTS "IX_StockReportLine_MaterialId" ON "StockReportLine" ("MaterialId");
            CREATE INDEX IF NOT EXISTS "IX_StockReportLine_StockReportId" ON "StockReportLine" ("StockReportId");
            CREATE INDEX IF NOT EXISTS "IX_Supplier_CreatedBy" ON "Supplier" ("CreatedBy");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Supplier_Name" ON "Supplier" ("Name") WHERE "IsVoid" = false;

            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Order_AccountingCurrency_CurrencyCode') THEN
                    ALTER TABLE "Order" ADD CONSTRAINT "FK_Order_AccountingCurrency_CurrencyCode" FOREIGN KEY ("CurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Order_SalesChannel_ChannelId') THEN
                    ALTER TABLE "Order" ADD CONSTRAINT "FK_Order_SalesChannel_ChannelId" FOREIGN KEY ("ChannelId") REFERENCES "SalesChannel" ("Id") ON DELETE RESTRICT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Product_AccountingCurrency_SellingCurrencyCode') THEN
                    ALTER TABLE "Product" ADD CONSTRAINT "FK_Product_AccountingCurrency_SellingCurrencyCode" FOREIGN KEY ("SellingCurrencyCode") REFERENCES "AccountingCurrency" ("Code") ON DELETE RESTRICT;
                END IF;
            END $$;
            """;

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
                name: "AccountingPurchase");

            migrationBuilder.DropTable(
                name: "CurrencyExchangeRate");

            migrationBuilder.DropTable(
                name: "Expense");

            migrationBuilder.DropTable(
                name: "ExpenseCategory");

            migrationBuilder.DropTable(
                name: "FinishedGoodsInventory");

            migrationBuilder.DropTable(
                name: "ImportTransactionLine");

            migrationBuilder.DropTable(
                name: "MarketingExpenditure");

            migrationBuilder.DropTable(
                name: "MaterialUsageRecord");

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
                name: "SalesFinishedGoodsConsumption");

            migrationBuilder.DropTable(
                name: "StockReportLine");

            migrationBuilder.DropTable(
                name: "AccountingCategory");

            migrationBuilder.DropTable(
                name: "ImportTransaction");

            migrationBuilder.DropTable(
                name: "ExternalOrder");

            migrationBuilder.DropTable(
                name: "OperatingExpenseCategory");

            migrationBuilder.DropTable(
                name: "ProductBom");

            migrationBuilder.DropTable(
                name: "PurchaseOrderItem");

            migrationBuilder.DropTable(
                name: "ReturnOrder");

            migrationBuilder.DropTable(
                name: "FinishedGoodsLot");

            migrationBuilder.DropTable(
                name: "StockReport");

            migrationBuilder.DropTable(
                name: "Material");

            migrationBuilder.DropTable(
                name: "PurchaseOrder");

            migrationBuilder.DropTable(
                name: "ProductionOrder");

            migrationBuilder.DropTable(
                name: "AccountingCurrency");

            migrationBuilder.DropTable(
                name: "Supplier");

            migrationBuilder.DropIndex(
                name: "IX_Product_SellingCurrencyCode",
                table: "Product");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_AccountingMoney_NonNegative",
                table: "OrderItem");

            migrationBuilder.DropIndex(
                name: "IX_Order_ChannelId",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_CurrencyCode",
                table: "Order");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Product",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<long>(
                name: "SellingPriceCents",
                table: "Product",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValue: 0L);

            migrationBuilder.AlterColumn<string>(
                name: "SellingCurrencyCode",
                table: "Product",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3,
                oldDefaultValue: "UAH");

            migrationBuilder.AlterColumn<decimal>(
                name: "MarginThresholdPct",
                table: "Product",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 60m);

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "Product",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "OrderItem",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "OrderItem",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<bool>(
                name: "IsVoid",
                table: "Order",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<decimal>(
                name: "ExchangeRateToBase",
                table: "Order",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,8)",
                oldPrecision: 18,
                oldScale: 8,
                oldDefaultValue: 1m);

            migrationBuilder.AlterColumn<string>(
                name: "CurrencyCode",
                table: "Order",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(3)",
                oldMaxLength: 3,
                oldDefaultValue: "UAH");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");
        }
    }
}
