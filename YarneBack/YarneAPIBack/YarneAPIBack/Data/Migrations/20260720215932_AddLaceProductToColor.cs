using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaceProductToColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LaceProductId",
                table: "Color",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Color_LaceProductId",
                table: "Color",
                column: "LaceProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_Color_Product_LaceProductId",
                table: "Color",
                column: "LaceProductId",
                principalTable: "Product",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Color_Product_LaceProductId",
                table: "Color");

            migrationBuilder.DropIndex(
                name: "IX_Color_LaceProductId",
                table: "Color");

            migrationBuilder.DropColumn(
                name: "LaceProductId",
                table: "Color");
        }
    }
}
