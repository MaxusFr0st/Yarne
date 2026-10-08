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
            // Idempotent on purpose: the same statements run from OrderFlowSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.OrderFlowSchemaPatches.EnsureSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EurTotalCents", table: "Order");
            migrationBuilder.DropColumn(name: "PaymentCurrency", table: "Order");
        }
    }
}
