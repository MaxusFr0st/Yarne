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
            migrationBuilder.DropForeignKey(
                name: "FK__OrderItem__Produ__6C190EBB",
                table: "OrderItem");

            migrationBuilder.AlterColumn<int>(
                name: "ProductId",
                table: "OrderItem",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "ProductCode",
                table: "OrderItem",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProductImageUrl",
                table: "OrderItem",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductName",
                table: "OrderItem",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE "OrderItem" oi
                SET "ProductName" = p."Name",
                    "ProductCode" = p."ProductCode",
                    "ProductImageUrl" = NULLIF(p."ImageUrl", '')
                FROM "Product" p
                WHERE oi."ProductId" = p."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "PhoneNumber",
                table: "Customer",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK__OrderItem__Produ__6C190EBB",
                table: "OrderItem",
                column: "ProductId",
                principalTable: "Product",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK__OrderItem__Produ__6C190EBB",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ProductCode",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ProductImageUrl",
                table: "OrderItem");

            migrationBuilder.DropColumn(
                name: "ProductName",
                table: "OrderItem");

            migrationBuilder.AlterColumn<int>(
                name: "ProductId",
                table: "OrderItem",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PhoneNumber",
                table: "Customer",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK__OrderItem__Produ__6C190EBB",
                table: "OrderItem",
                column: "ProductId",
                principalTable: "Product",
                principalColumn: "Id");
        }
    }
}
