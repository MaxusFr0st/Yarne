using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialRollTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ItemCount",
                table: "PurchaseOrderItem",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LengthPerItem",
                table: "PurchaseOrderItem",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultLengthPerItem",
                table: "Material",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TrackByItem",
                table: "Material",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseOrderItem_ItemShape",
                table: "PurchaseOrderItem",
                sql: "(\"ItemCount\" IS NULL AND \"LengthPerItem\" IS NULL) OR (\"ItemCount\" > 0 AND \"LengthPerItem\" > 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseOrderItem_ItemShape",
                table: "PurchaseOrderItem");

            migrationBuilder.DropColumn(
                name: "ItemCount",
                table: "PurchaseOrderItem");

            migrationBuilder.DropColumn(
                name: "LengthPerItem",
                table: "PurchaseOrderItem");

            migrationBuilder.DropColumn(
                name: "DefaultLengthPerItem",
                table: "Material");

            migrationBuilder.DropColumn(
                name: "TrackByItem",
                table: "Material");
        }
    }
}
