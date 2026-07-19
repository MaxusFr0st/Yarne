using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameOrderTotalToTotalCents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "TotalCents",
                table: "Order",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql(
                """UPDATE "Order" SET "TotalCents" = ROUND("Total" * 100)::bigint""");

            migrationBuilder.DropColumn(
                name: "Total",
                table: "Order");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Total",
                table: "Order",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(
                """UPDATE "Order" SET "Total" = "TotalCents" / 100.0""");

            migrationBuilder.DropColumn(
                name: "TotalCents",
                table: "Order");
        }
    }
}
