using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaceSaleComposition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsInternalComponent",
                table: "Product",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ParentOrderItemId",
                table: "OrderItem",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductSaleComponent",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ComponentProductId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Condition = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "with_lace"),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductSaleComponent", x => x.Id);
                    table.CheckConstraint("CK_ProductSaleComponent_Quantity_Positive", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_ProductSaleComponent_Product_ComponentProductId",
                        column: x => x.ComponentProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductSaleComponent_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItem_ParentOrderItemId",
                table: "OrderItem",
                column: "ParentOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductSaleComponent_ComponentProductId",
                table: "ProductSaleComponent",
                column: "ComponentProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductSaleComponent_ProductId_ComponentProductId_Condition",
                table: "ProductSaleComponent",
                columns: new[] { "ProductId", "ComponentProductId", "Condition" },
                unique: true,
                filter: "\"IsVoid\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItem_OrderItem_ParentOrderItemId",
                table: "OrderItem",
                column: "ParentOrderItemId",
                principalTable: "OrderItem",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItem_OrderItem_ParentOrderItemId",
                table: "OrderItem");

            migrationBuilder.DropTable(
                name: "ProductSaleComponent");

            migrationBuilder.DropIndex(
                name: "IX_OrderItem_ParentOrderItemId",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "IsInternalComponent",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "ParentOrderItemId",
                table: "OrderItem");
        }
    }
}
