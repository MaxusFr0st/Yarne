using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnFeeReversalAndProductionCapitalizedCogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "FeeReversedCents",
                table: "ReturnOrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<long>(
                name: "CapitalizedCogsCents",
                table: "ProductionOrder",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeeReversedCents",
                table: "ReturnOrderItem");

            migrationBuilder.DropColumn(
                name: "CapitalizedCogsCents",
                table: "ProductionOrder");
        }
    }
}
