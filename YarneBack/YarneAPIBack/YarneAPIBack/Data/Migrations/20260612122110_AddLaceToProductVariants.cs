using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaceToProductVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductVariantStock",
                table: "ProductVariantStock");

            migrationBuilder.AddColumn<bool>(
                name: "Lace",
                table: "ProductVariantStock",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Lace",
                table: "ProductColorSizeImage",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Lace",
                table: "Product",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductVariantStock",
                table: "ProductVariantStock",
                columns: new[] { "ProductId", "ColorId", "SizeId", "Lace" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductVariantStock",
                table: "ProductVariantStock");

            migrationBuilder.DropColumn(
                name: "Lace",
                table: "ProductVariantStock");

            migrationBuilder.DropColumn(
                name: "Lace",
                table: "ProductColorSizeImage");

            migrationBuilder.DropColumn(
                name: "Lace",
                table: "Product");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductVariantStock",
                table: "ProductVariantStock",
                columns: new[] { "ProductId", "ColorId", "SizeId" });
        }
    }
}
