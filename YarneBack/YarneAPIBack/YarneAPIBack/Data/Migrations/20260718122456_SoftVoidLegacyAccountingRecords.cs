using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class SoftVoidLegacyAccountingRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "MaterialUsageRecord",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "ImportTransaction",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "ExpenseCategory",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVoid",
                table: "Expense",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.DropIndex(
                name: "IX_ExpenseCategory_Name",
                table: "ExpenseCategory");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategory_Name",
                table: "ExpenseCategory",
                column: "Name",
                unique: true,
                filter: "\"IsVoid\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExpenseCategory_Name",
                table: "ExpenseCategory");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategory_Name",
                table: "ExpenseCategory",
                column: "Name",
                unique: true);

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "MaterialUsageRecord");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "ImportTransaction");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "ExpenseCategory");

            migrationBuilder.DropColumn(
                name: "IsVoid",
                table: "Expense");
        }
    }
}
