using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPlayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerSaves",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SaveVersion = table.Column<int>(type: "integer", nullable: false),
                    PlayerVariant = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    RegionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SpawnId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Facing = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    MovementMode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConcurrencyToken = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerSaves", x => x.PlayerId);
                    table.ForeignKey(
                        name: "FK_PlayerSaves_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerSaves");

            migrationBuilder.DropTable(
                name: "Players");
        }
    }
}
