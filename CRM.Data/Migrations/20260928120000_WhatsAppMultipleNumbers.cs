using CRM.Data.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20260928120000_WhatsAppMultipleNumbers")]
public partial class WhatsAppMultipleNumbers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "c_phone_number_id",
            table: "crm_conversacion",
            type: "nvarchar(100)",
            maxLength: 100,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "c_phone_number_id", table: "crm_conversacion");
    }
}
