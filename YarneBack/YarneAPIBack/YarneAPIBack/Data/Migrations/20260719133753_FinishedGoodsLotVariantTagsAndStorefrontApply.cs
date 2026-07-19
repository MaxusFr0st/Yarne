using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class FinishedGoodsLotVariantTagsAndStorefrontApply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FinishedGoodsLot_ProductionOrderId",
                table: "FinishedGoodsLot");

            migrationBuilder.AddColumn<int>(
                name: "AppliedToStorefrontQuantity",
                table: "FinishedGoodsLot",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ColorId",
                table: "FinishedGoodsLot",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Lace",
                table: "FinishedGoodsLot",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SizeId",
                table: "FinishedGoodsLot",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_ColorId",
                table: "FinishedGoodsLot",
                column: "ColorId");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_ProductionOrderId",
                table: "FinishedGoodsLot",
                column: "ProductionOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_SizeId",
                table: "FinishedGoodsLot",
                column: "SizeId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_FinishedGoodsLot_Applied_Range",
                table: "FinishedGoodsLot",
                sql: "\"AppliedToStorefrontQuantity\" >= 0 AND \"AppliedToStorefrontQuantity\" <= \"QuantityProduced\"");

            migrationBuilder.AddForeignKey(
                name: "FK_FinishedGoodsLot_Color_ColorId",
                table: "FinishedGoodsLot",
                column: "ColorId",
                principalTable: "Color",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FinishedGoodsLot_Size_SizeId",
                table: "FinishedGoodsLot",
                column: "SizeId",
                principalTable: "Size",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FinishedGoodsLot_Color_ColorId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropForeignKey(
                name: "FK_FinishedGoodsLot_Size_SizeId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropIndex(
                name: "IX_FinishedGoodsLot_ColorId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropIndex(
                name: "IX_FinishedGoodsLot_ProductionOrderId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropIndex(
                name: "IX_FinishedGoodsLot_SizeId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropCheckConstraint(
                name: "CK_FinishedGoodsLot_Applied_Range",
                table: "FinishedGoodsLot");

            migrationBuilder.DropColumn(
                name: "AppliedToStorefrontQuantity",
                table: "FinishedGoodsLot");

            migrationBuilder.DropColumn(
                name: "ColorId",
                table: "FinishedGoodsLot");

            migrationBuilder.DropColumn(
                name: "Lace",
                table: "FinishedGoodsLot");

            migrationBuilder.DropColumn(
                name: "SizeId",
                table: "FinishedGoodsLot");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_ProductionOrderId",
                table: "FinishedGoodsLot",
                column: "ProductionOrderId",
                unique: true);
        }
    }
}
