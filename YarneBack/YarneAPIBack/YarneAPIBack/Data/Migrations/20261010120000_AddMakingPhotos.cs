using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <summary>"Making of" photos on request: two nullable order columns and a new table. Safe on a live database.</summary>
    public partial class AddMakingPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent on purpose: the same statements run from OrderFlowSchemaPatches at every start.
            migrationBuilder.Sql(YarneAPIBack.Data.OrderFlowSchemaPatches.EnsureSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "OrderMakingPhoto");
            migrationBuilder.DropColumn(name: "PhotosRequestedAt", table: "Order");
            migrationBuilder.DropColumn(name: "PhotosNotifiedAt", table: "Order");
        }
    }
}
