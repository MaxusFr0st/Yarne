using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class EnsureCustomerOAuthColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "OAuthProvider" character varying(50) NULL;
                ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "OAuthProviderId" character varying(255) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Customer" DROP COLUMN IF EXISTS "OAuthProvider";
                ALTER TABLE "Customer" DROP COLUMN IF EXISTS "OAuthProviderId";
                """);
        }
    }
}
