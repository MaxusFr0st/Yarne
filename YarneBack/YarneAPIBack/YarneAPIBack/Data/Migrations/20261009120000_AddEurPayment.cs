using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>The currency an order is paid in and its euro total. Nullable, so safe on a live database: every existing order stays hryvnia.</summary>
    public partial class AddEurPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentCurrency",
                table: "Order",
                type: "character varying(3)",
                maxLength: 3,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "EurTotalCents",
                table: "Order",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EurTotalCents", table: "Order");
            migrationBuilder.DropColumn(name: "PaymentCurrency", table: "Order");
        }
    }
}
