using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTtnSenderProfileIdToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TtnSenderProfileId",
                table: "Order",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TtnSenderProfileId",
                table: "Order");
        }
    }
}
