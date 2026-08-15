using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNovaPoshtaDeliveryToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeliveryCityName",
                table: "Order",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCityRef",
                table: "Order",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryWarehouseName",
                table: "Order",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryWarehouseRef",
                table: "Order",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientFirstName",
                table: "Order",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientLastName",
                table: "Order",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientPhone",
                table: "Order",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TrackingCheckedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackingStatus",
                table: "Order",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackingStatusCode",
                table: "Order",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TtnCreatedAt",
                table: "Order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TtnNumber",
                table: "Order",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TtnRef",
                table: "Order",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryCityName",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "DeliveryCityRef",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "DeliveryWarehouseName",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "DeliveryWarehouseRef",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "RecipientFirstName",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "RecipientLastName",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "RecipientPhone",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TrackingCheckedAt",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TrackingStatus",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TrackingStatusCode",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TtnCreatedAt",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TtnNumber",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "TtnRef",
                table: "Order");
        }
    }
}
