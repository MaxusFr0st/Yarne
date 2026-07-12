using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class EnsureOrderItemSnapshotColumnsIdempotent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(OrderItemSchemaPatches.EnsureSnapshotSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductCode";
                ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductImageUrl";
                ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductName";
                """);
        }
    }
}
