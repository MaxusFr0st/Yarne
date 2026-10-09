using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>
    /// English product texts, per-size measurements, the size-panel photo and the retried-order id: nullable columns
    /// and one partial unique index. Safe on a live database. The English texts the owner approved are written here
    /// once (only into fields that are still empty), never by the bootstrap patch.
    /// </summary>
    public partial class AddEnglishTextsSizeMeasurementsOrderRequestId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent on purpose: the same statements run from ShopContentSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.ShopContentSchemaPatches.EnsureSql);
            migrationBuilder.Sql(YarneAPIBack.Data.ProductEnglishSeed.BuildSql());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Order_ClientRequestId\";");
            migrationBuilder.DropColumn(name: "ClientRequestId", table: "Order");
            migrationBuilder.DropColumn(name: "NameEn", table: "Category");
            migrationBuilder.DropColumn(name: "WidthCm", table: "ProductSize");
            migrationBuilder.DropColumn(name: "HeightCm", table: "ProductSize");
            migrationBuilder.DropColumn(name: "DepthCm", table: "ProductSize");
            migrationBuilder.DropColumn(name: "HandleCm", table: "ProductSize");
            migrationBuilder.DropColumn(name: "NameEn", table: "Product");
            migrationBuilder.DropColumn(name: "DescriptionEn", table: "Product");
            migrationBuilder.DropColumn(name: "MaterialEn", table: "Product");
            migrationBuilder.DropColumn(name: "SizePhotoUrl", table: "Product");
        }
    }
}
