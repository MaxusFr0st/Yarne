using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveColorLaceProductId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE table_schema = 'public'
                          AND table_name = 'Color'
                          AND constraint_name = 'FK_Color_Product_LaceProductId'
                    ) THEN
                        ALTER TABLE "Color" DROP CONSTRAINT "FK_Color_Product_LaceProductId";
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                          AND tablename = 'Color'
                          AND indexname = 'IX_Color_LaceProductId'
                    ) THEN
                        DROP INDEX "IX_Color_LaceProductId";
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Color'
                          AND column_name = 'LaceProductId'
                    ) THEN
                        ALTER TABLE "Color" DROP COLUMN "LaceProductId";
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'Color'
                          AND column_name = 'LaceProductId'
                    ) THEN
                        ALTER TABLE "Color" ADD COLUMN "LaceProductId" integer NULL;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                          AND tablename = 'Color'
                          AND indexname = 'IX_Color_LaceProductId'
                    ) THEN
                        CREATE INDEX "IX_Color_LaceProductId" ON "Color" ("LaceProductId");
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'Product'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE table_schema = 'public'
                          AND table_name = 'Color'
                          AND constraint_name = 'FK_Color_Product_LaceProductId'
                    ) THEN
                        ALTER TABLE "Color"
                            ADD CONSTRAINT "FK_Color_Product_LaceProductId"
                            FOREIGN KEY ("LaceProductId") REFERENCES "Product" ("Id")
                            ON DELETE RESTRICT;
                    END IF;
                END $$;
                """);
        }
    }
}
