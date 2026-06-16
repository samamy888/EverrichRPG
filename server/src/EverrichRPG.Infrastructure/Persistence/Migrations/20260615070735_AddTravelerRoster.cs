using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTravelerRoster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Travelers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Variant = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RegionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Dialogue = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    MovementType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Facing = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Speed = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Travelers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Travelers_RegionId_IsActive",
                table: "Travelers",
                columns: new[] { "RegionId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Travelers");
        }
    }
}
