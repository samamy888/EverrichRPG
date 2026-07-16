using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EverrichRPG.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ArchitectureBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
