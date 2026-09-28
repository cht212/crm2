using CRM.Data.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20260928121000_PersistentLoginAttempts")]
public partial class PersistentLoginAttempts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "crm_login_attempt",
            columns: table => new
            {
                c_key = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                n_failures = table.Column<int>(type: "int", nullable: false),
                d_blocked_until_utc = table.Column<DateTime>(type: "datetime2", nullable: true),
                d_updated_utc = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_crm_login_attempt", x => x.c_key));
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable(name: "crm_login_attempt");
}
