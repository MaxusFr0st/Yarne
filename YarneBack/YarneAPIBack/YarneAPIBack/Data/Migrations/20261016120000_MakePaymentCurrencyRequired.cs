using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>Order.PaymentCurrency is always UAH or EUR: older orders filled in, then the column made required. Safe on a live database.</summary>
    public partial class MakePaymentCurrencyRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent on purpose: the same statements run from OrderFlowSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.OrderFlowSchemaPatches.PaymentCurrencyRequiredSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "CK_Order_PaymentCurrency";
                ALTER TABLE "Order" ALTER COLUMN "PaymentCurrency" DROP NOT NULL;
                ALTER TABLE "Order" ALTER COLUMN "PaymentCurrency" DROP DEFAULT;
                """);
        }
    }
}
