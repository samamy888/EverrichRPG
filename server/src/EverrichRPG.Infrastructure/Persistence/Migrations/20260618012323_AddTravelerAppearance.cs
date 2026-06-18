using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [Migration("20260618012323_AddTravelerAppearance")]
    public partial class AddTravelerAppearance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Variant",
                table: "Travelers",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Travelers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AgeGroup",
                table: "Travelers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "HairStyle",
                table: "Travelers",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Top",
                table: "Travelers",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Pants",
                table: "Travelers",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Gender", table: "Travelers");
            migrationBuilder.DropColumn(name: "AgeGroup", table: "Travelers");
            migrationBuilder.DropColumn(name: "HairStyle", table: "Travelers");
            migrationBuilder.DropColumn(name: "Top", table: "Travelers");
            migrationBuilder.DropColumn(name: "Pants", table: "Travelers");

            migrationBuilder.AlterColumn<string>(
                name: "Variant",
                table: "Travelers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);
        }
    }
}
