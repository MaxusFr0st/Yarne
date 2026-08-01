using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCountriesFromDatabase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK__CustomerA__Count__48CFD27E",
                table: "CustomerAddress");

            migrationBuilder.DropForeignKey(
                name: "FK__OrderItem__Count__6D0D32F4",
                table: "OrderItem");

            migrationBuilder.DropTable(
                name: "ProductCountry");

            migrationBuilder.DropTable(
                name: "Country");

            migrationBuilder.DropIndex(
                name: "IX_OrderItem_CountryId",
                table: "OrderItem");

            migrationBuilder.DropIndex(
                name: "IX_CustomerAddress_CountryId",
                table: "CustomerAddress");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "CustomerAddress");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CountryId",
                table: "OrderItem",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CountryId",
                table: "CustomerAddress",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Country",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Country__3214EC07F74E3672", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductCountry",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    CountryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ProductC__5501D0C4A2BD1DC7", x => new { x.ProductId, x.CountryId });
                    table.ForeignKey(
                        name: "FK__ProductCo__Count__5CD6CB2B",
                        column: x => x.CountryId,
                        principalTable: "Country",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__ProductCo__Produ__5BE2A6F2",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItem_CountryId",
                table: "OrderItem",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAddress_CountryId",
                table: "CustomerAddress",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "UQ__Country__737584F6ED59CDE9",
                table: "Country",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductCountry_CountryId",
                table: "ProductCountry",
                column: "CountryId");

            migrationBuilder.AddForeignKey(
                name: "FK__CustomerA__Count__48CFD27E",
                table: "CustomerAddress",
                column: "CountryId",
                principalTable: "Country",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK__OrderItem__Count__6D0D32F4",
                table: "OrderItem",
                column: "CountryId",
                principalTable: "Country",
                principalColumn: "Id");
        }
    }
}
