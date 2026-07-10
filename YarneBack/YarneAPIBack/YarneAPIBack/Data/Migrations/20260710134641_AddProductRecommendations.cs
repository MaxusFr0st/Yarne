using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProductRecommendations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductRecommendation",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    RelatedProductId = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductRecommendation", x => new { x.ProductId, x.RelatedProductId });
                    table.ForeignKey(
                        name: "FK_ProductRecommendation_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductRecommendation_Product_RelatedProductId",
                        column: x => x.RelatedProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductRecommendation_ProductId",
                table: "ProductRecommendation",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductRecommendation_RelatedProductId",
                table: "ProductRecommendation",
                column: "RelatedProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductRecommendation");
        }
    }
}
