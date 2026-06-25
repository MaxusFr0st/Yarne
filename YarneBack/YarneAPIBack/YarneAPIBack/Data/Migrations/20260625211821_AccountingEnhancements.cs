using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AccountingEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ExternalOrderId",
                table: "MaterialUsageRecord",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "ImportTransaction",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ExpenseCategory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseCategory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExternalOrder",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalOrder", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaterialUsageRecord_ExternalOrderId",
                table: "MaterialUsageRecord",
                column: "ExternalOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategory_Name",
                table: "ExpenseCategory",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalOrder_OrderDate",
                table: "ExternalOrder",
                column: "OrderDate");

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialUsageRecord_ExternalOrder_ExternalOrderId",
                table: "MaterialUsageRecord",
                column: "ExternalOrderId",
                principalTable: "ExternalOrder",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaterialUsageRecord_ExternalOrder_ExternalOrderId",
                table: "MaterialUsageRecord");

            migrationBuilder.DropTable(
                name: "ExpenseCategory");

            migrationBuilder.DropTable(
                name: "ExternalOrder");

            migrationBuilder.DropIndex(
                name: "IX_MaterialUsageRecord_ExternalOrderId",
                table: "MaterialUsageRecord");

            migrationBuilder.DropColumn(
                name: "ExternalOrderId",
                table: "MaterialUsageRecord");

            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "ImportTransaction");
        }
    }
}
