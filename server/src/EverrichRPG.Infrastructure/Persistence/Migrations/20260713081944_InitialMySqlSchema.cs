using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialMySqlSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    DisplayName = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true),
                    Type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Shops",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    Welcome = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    ClerkMessage = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shops", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Travelers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    Variant = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Gender = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    AgeGroup = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    HairStyle = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Top = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Pants = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Dialogue = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    MovementType = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    Facing = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    Speed = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Travelers", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PlayerSaves",
                columns: table => new
                {
                    PlayerId = table.Column<Guid>(type: "char(36)", nullable: false),
                    SaveVersion = table.Column<int>(type: "int", nullable: false),
                    PlayerVariant = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    RegionId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    SpawnId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    Facing = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    MovementMode = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    ConcurrencyToken = table.Column<Guid>(type: "char(36)", nullable: false)
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
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    ShopId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    Category = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Sku = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    Price = table.Column<int>(type: "int", nullable: false),
                    PromotionPrice = table.Column<int>(type: "int", nullable: true),
                    PromotionStartAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    PromotionEndAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    StockQuantity = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Shops_ShopId",
                        column: x => x.ShopId,
                        principalTable: "Shops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Products_ShopId_DisplayOrder",
                table: "Products",
                columns: new[] { "ShopId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Sku",
                table: "Products",
                column: "Sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Travelers_IsActive",
                table: "Travelers",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerSaves");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Travelers");

            migrationBuilder.DropTable(
                name: "Players");

            migrationBuilder.DropTable(
                name: "Shops");
        }
    }
}
