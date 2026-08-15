using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProductStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductVariantStock");

            migrationBuilder.DropColumn(
                name: "QuantityInStock",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "TrackStock",
                table: "Category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuantityInStock",
                table: "Product",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "TrackStock",
                table: "Category",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ProductVariantStock",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ColorId = table.Column<int>(type: "integer", nullable: false),
                    SizeId = table.Column<int>(type: "integer", nullable: false),
                    Lace = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    QuantityInStock = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariantStock", x => new { x.ProductId, x.ColorId, x.SizeId, x.Lace });
                    table.ForeignKey(
                        name: "FK_ProductVariantStock_ProductColor_ProductId_ColorId",
                        columns: x => new { x.ProductId, x.ColorId },
                        principalTable: "ProductColor",
                        principalColumns: new[] { "ProductId", "ColorId" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductVariantStock_ProductSize_ProductId_SizeId",
                        columns: x => new { x.ProductId, x.SizeId },
                        principalTable: "ProductSize",
                        principalColumns: new[] { "ProductId", "SizeId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariantStock_ProductId_SizeId",
                table: "ProductVariantStock",
                columns: new[] { "ProductId", "SizeId" });
        }
    }
}
