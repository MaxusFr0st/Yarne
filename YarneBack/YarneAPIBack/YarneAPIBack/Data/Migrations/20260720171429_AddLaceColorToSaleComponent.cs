using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaceColorToSaleComponent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ColorId",
                table: "ProductSaleComponent",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductSaleComponent_ColorId",
                table: "ProductSaleComponent",
                column: "ColorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductSaleComponent_ProductId_Condition_ColorId",
                table: "ProductSaleComponent",
                columns: new[] { "ProductId", "Condition", "ColorId" },
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductSaleComponent_Color_ColorId",
                table: "ProductSaleComponent",
                column: "ColorId",
                principalTable: "Color",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductSaleComponent_Color_ColorId",
                table: "ProductSaleComponent");

            migrationBuilder.DropIndex(
                name: "IX_ProductSaleComponent_ColorId",
                table: "ProductSaleComponent");

            migrationBuilder.DropIndex(
                name: "IX_ProductSaleComponent_ProductId_Condition_ColorId",
                table: "ProductSaleComponent");

            migrationBuilder.DropColumn(
                name: "ColorId",
                table: "ProductSaleComponent");
        }
    }
}
