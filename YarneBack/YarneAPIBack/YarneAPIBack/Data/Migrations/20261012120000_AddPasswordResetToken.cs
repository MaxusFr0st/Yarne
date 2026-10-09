using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>The "forgot password" links: one new table. Safe on a live database.</summary>
    public partial class AddPasswordResetToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent on purpose: the same statements run from PasswordResetSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.PasswordResetSchemaPatches.EnsureSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PasswordResetToken");
        }
    }
}
