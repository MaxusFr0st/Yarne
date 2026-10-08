using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>When the customer said they paid (receipt attached). Nullable, so safe on a live database.</summary>
    public partial class AddPaymentClaim : Migration
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
            migrationBuilder.DropColumn(name: "PaymentClaimedAt", table: "Order");
        }
    }
}
