using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>
    /// Public order number, status-page token, payment choice, cancel reason and the foreign-delivery
    /// flag. Every column is nullable (or defaulted), so it is safe on a live database with rows: the
    /// unique indexes ignore NULLs, and <see cref="OrderTrackingSchemaPatches"/> numbers the existing
    /// orders and gives them tokens at startup, right after migrations are applied.
    /// </summary>
    public partial class AddGuestOrderTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Order",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsForeignDelivery",
                table: "Order",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OrderNumber",
                table: "Order",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentChoice",
                table: "Order",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentChoiceAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusToken",
                table: "Order",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryAddress",
                table: "Order",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCarrier",
                table: "Order",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCountryCode",
                table: "Order",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCountryName",
                table: "Order",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryPostalCode",
                table: "Order",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalizedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentReceivedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptContentType",
                table: "Order",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptKey",
                table: "Order",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceiptUploadedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Order_OrderNumber",
                table: "Order",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Order_StatusToken",
                table: "Order",
                column: "StatusToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Order_OrderNumber",
                table: "Order");

            migrationBuilder.DropIndex(
                name: "IX_Order_StatusToken",
                table: "Order");

            migrationBuilder.DropColumn(name: "DeliveryAddress", table: "Order");
            migrationBuilder.DropColumn(name: "DeliveryCarrier", table: "Order");
            migrationBuilder.DropColumn(name: "DeliveryCountryCode", table: "Order");
            migrationBuilder.DropColumn(name: "DeliveryCountryName", table: "Order");
            migrationBuilder.DropColumn(name: "DeliveryPostalCode", table: "Order");
            migrationBuilder.DropColumn(name: "FinalizedAt", table: "Order");
            migrationBuilder.DropColumn(name: "PaymentReceivedAt", table: "Order");
            migrationBuilder.DropColumn(name: "ReceiptContentType", table: "Order");
            migrationBuilder.DropColumn(name: "ReceiptKey", table: "Order");
            migrationBuilder.DropColumn(name: "ReceiptUploadedAt", table: "Order");
            migrationBuilder.DropColumn(name: "CancelReason", table: "Order");
            migrationBuilder.DropColumn(name: "IsForeignDelivery", table: "Order");
            migrationBuilder.DropColumn(name: "OrderNumber", table: "Order");
            migrationBuilder.DropColumn(name: "PaymentChoice", table: "Order");
            migrationBuilder.DropColumn(name: "PaymentChoiceAt", table: "Order");
            migrationBuilder.DropColumn(name: "StatusToken", table: "Order");
        }
    }
}
