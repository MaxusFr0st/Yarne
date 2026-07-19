using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesFeeAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ChannelFeeShareCents",
                table: "OrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderItem_AccountingMoney_NonNegative",
                table: "OrderItem",
                sql: "\"ListedPriceCents\" >= 0 AND \"NetPriceCents\" >= 0 AND \"ChannelFeeShareCents\" >= 0 AND \"UnitCogsCents\" >= 0 AND \"VatAmountCents\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderItem_AccountingMoney_NonNegative",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ChannelFeeShareCents",
                table: "OrderItem");
        }
    }
}
