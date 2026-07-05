using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultColorIdToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultColorId",
                table: "Product",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Product_DefaultColorId",
                table: "Product",
                column: "DefaultColorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Product_Color_DefaultColorId",
                table: "Product",
                column: "DefaultColorId",
                principalTable: "Color",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Product_Color_DefaultColorId",
                table: "Product");

            migrationBuilder.DropIndex(
                name: "IX_Product_DefaultColorId",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "DefaultColorId",
                table: "Product");
        }
    }
}
