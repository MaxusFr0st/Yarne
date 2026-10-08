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
            // Idempotent on purpose: the same statements run from OrderFlowSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.OrderFlowSchemaPatches.EnsureSql);
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
