using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveClientOrderIdFromOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Order_ClientOrderId",
                table: "Order");

            migrationBuilder.DropColumn(
                name: "ClientOrderId",
                table: "Order");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientOrderId",
                table: "Order",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Order_ClientOrderId",
                table: "Order",
                column: "ClientOrderId",
                unique: true,
                filter: "\"ClientOrderId\" IS NOT NULL");
        }
    }
}
