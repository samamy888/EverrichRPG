using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeTravelerPoolPermanent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Travelers_RegionId_IsActive",
                table: "Travelers");

            migrationBuilder.DropColumn(
                name: "RegionId",
                table: "Travelers");

            migrationBuilder.CreateIndex(
                name: "IX_Travelers_IsActive",
                table: "Travelers",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Travelers_IsActive",
                table: "Travelers");

            migrationBuilder.AddColumn<string>(
                name: "RegionId",
                table: "Travelers",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Travelers_RegionId_IsActive",
                table: "Travelers",
                columns: new[] { "RegionId", "IsActive" });
        }
    }
}
