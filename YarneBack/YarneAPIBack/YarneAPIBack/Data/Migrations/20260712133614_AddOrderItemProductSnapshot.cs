using Microsoft.EntityFrameworkCore.Migrations;
using YarneAPIBack.Data;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemProductSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(OrderItemSchemaPatches.EnsureSnapshotSql);

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    BEGIN
                        ALTER TABLE "Customer" ALTER COLUMN "PhoneNumber" TYPE character varying(32);
                    EXCEPTION
                        WHEN others THEN NULL;
                    END;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    fk_name text;
                BEGIN
                    SELECT tc.constraint_name
                    INTO fk_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = 'public'
                      AND tc.table_name = 'OrderItem'
                      AND kcu.column_name = 'ProductId'
                    LIMIT 1;

                    IF fk_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE "OrderItem" DROP CONSTRAINT %I', fk_name);
                    END IF;

                    ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductCode";
                    ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductImageUrl";
                    ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "ProductName";

                    UPDATE "OrderItem" SET "ProductId" = 0 WHERE "ProductId" IS NULL;
                    ALTER TABLE "OrderItem" ALTER COLUMN "ProductId" SET NOT NULL;

                    ALTER TABLE "OrderItem"
                        ADD CONSTRAINT "FK__OrderItem__Produ__6C190EBB"
                        FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id");

                    ALTER TABLE "Customer" ALTER COLUMN "PhoneNumber" TYPE character varying(20);
                END $$;
                """);
        }
    }
}
