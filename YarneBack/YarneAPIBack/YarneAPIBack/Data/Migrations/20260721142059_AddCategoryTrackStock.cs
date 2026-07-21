using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryTrackStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "TrackStock",
                table: "Category",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Lace/strap categories are internal accounting materials, not stock-tracked retail
            // inventory — exclude them from low-stock alerts by default.
            migrationBuilder.Sql(@"
                UPDATE ""Category""
                SET ""TrackStock"" = false
                WHERE ""Name"" ILIKE '%мережив%'
                   OR ""Name"" ILIKE '%ремінц%'
                   OR ""Name"" ILIKE 'lace'
                   OR ""Name"" ILIKE 'ремінці';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TrackStock",
                table: "Category");
        }
    }
}
