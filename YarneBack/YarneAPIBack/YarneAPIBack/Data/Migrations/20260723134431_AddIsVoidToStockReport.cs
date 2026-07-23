using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsVoidToStockReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "StockReport",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_StockReport_IsVoid",
                table: "StockReport",
                column: "IsVoid");

            // Soft-void every existing locked snapshot (there is only one in production).
            // Stock reports are historical locks and do not reverse inventory — voiding only
            // removes them from the active Stock Reports list so a fresh snapshot can be taken.
            migrationBuilder.Sql(@"UPDATE ""StockReport"" SET ""IsVoid"" = true WHERE ""IsVoid"" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockReport_IsVoid",
                table: "StockReport");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "StockReport");
        }
    }
}
