using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemProductSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent SQL so production can recover if a prior deploy failed mid-migration.
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    fk_name text;
                BEGIN
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductName" character varying(200) NOT NULL DEFAULT '';
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductCode" character varying(50) NOT NULL DEFAULT '';
                    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "ProductImageUrl" character varying(500) NULL;

                    UPDATE "OrderItem" oi
                    SET "ProductName" = p."Name",
                        "ProductCode" = p."ProductCode",
                        "ProductImageUrl" = NULLIF(p."ImageUrl", '')
                    FROM "Product" p
                    WHERE oi."ProductId" = p."Id"
                      AND (oi."ProductName" = '' OR oi."ProductCode" = '');

                    BEGIN
                        ALTER TABLE "OrderItem" ALTER COLUMN "ProductId" DROP NOT NULL;
                    EXCEPTION
                        WHEN others THEN NULL;
                    END;

                    SELECT tc.constraint_name
                    INTO fk_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = current_schema()
                      AND tc.table_name = 'OrderItem'
                      AND kcu.column_name = 'ProductId'
                    LIMIT 1;

                    IF fk_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE "OrderItem" DROP CONSTRAINT %I', fk_name);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE table_schema = current_schema()
                          AND table_name = 'OrderItem'
                          AND constraint_name = 'FK__OrderItem__Produ__6C190EBB'
                    ) THEN
                        ALTER TABLE "OrderItem"
                            ADD CONSTRAINT "FK__OrderItem__Produ__6C190EBB"
                            FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id") ON DELETE SET NULL;
                    END IF;

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
                      AND tc.table_schema = current_schema()
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
