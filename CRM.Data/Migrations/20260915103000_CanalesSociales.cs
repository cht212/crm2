using CRM.Data.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(CrmDbContext))]
    [Migration("20260915103000_CanalesSociales")]
    public partial class CanalesSociales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "c_canal_origen",
                table: "crm_cliente",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "WHATSAPP");

            migrationBuilder.AddColumn<string>(
                name: "c_canal",
                table: "crm_conversacion",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "WHATSAPP");

            migrationBuilder.AddColumn<string>(
                name: "c_external_thread_id",
                table: "crm_conversacion",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "c_canal",
                table: "crm_mensaje",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "WHATSAPP");

            migrationBuilder.AddColumn<string>(
                name: "c_external_id",
                table: "crm_mensaje",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "c_canal_origen",
                table: "crm_cliente");

            migrationBuilder.DropColumn(
                name: "c_canal",
                table: "crm_conversacion");

            migrationBuilder.DropColumn(
                name: "c_external_thread_id",
                table: "crm_conversacion");

            migrationBuilder.DropColumn(
                name: "c_canal",
                table: "crm_mensaje");

            migrationBuilder.DropColumn(
                name: "c_external_id",
                table: "crm_mensaje");
        }
    }
}
