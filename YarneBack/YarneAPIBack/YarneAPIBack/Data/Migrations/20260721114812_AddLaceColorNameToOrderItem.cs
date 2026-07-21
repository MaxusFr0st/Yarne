using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaceColorNameToOrderItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Not a plain AddColumn: OrderItemSchemaPatches.ForceEnsureSnapshotColumnsAsync runs
            // BEFORE EF migrations at boot and already adds this column via ADD COLUMN IF NOT
            // EXISTS, so a non-idempotent AddColumn here would fail with "column already exists"
            // and abort the whole migration batch (including migrations after this one).
            migrationBuilder.Sql(
                """ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "LaceColorName" text NULL;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "LaceColorName";""");
        }
    }
}
