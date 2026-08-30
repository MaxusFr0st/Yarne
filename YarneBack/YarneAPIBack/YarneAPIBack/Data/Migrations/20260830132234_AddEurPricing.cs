using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEurPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EurPrice",
                table: "ProductColor",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EurPriceWithLace",
                table: "ProductColor",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EurPrice",
                table: "Product",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EurUnitPrice",
                table: "OrderItem",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EurPrice",
                table: "ProductColor");

            migrationBuilder.DropColumn(
                name: "EurPriceWithLace",
                table: "ProductColor");

            migrationBuilder.DropColumn(
                name: "EurPrice",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "EurUnitPrice",
                table: "OrderItem");
        }
    }
}
