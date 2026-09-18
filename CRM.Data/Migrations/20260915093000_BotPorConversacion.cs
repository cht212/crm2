using System;
using CRM.Data.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(CrmDbContext))]
    [Migration("20260915093000_BotPorConversacion")]
    public partial class BotPorConversacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "c_bot_estado",
                table: "crm_conversacion",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "ACTIVO");

            migrationBuilder.AddColumn<DateTime>(
                name: "d_bot_pausado_desde",
                table: "crm_conversacion",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "n_bot_pausado_por",
                table: "crm_conversacion",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "c_bot_estado",
                table: "crm_conversacion");

            migrationBuilder.DropColumn(
                name: "d_bot_pausado_desde",
                table: "crm_conversacion");

            migrationBuilder.DropColumn(
                name: "n_bot_pausado_por",
                table: "crm_conversacion");
        }
    }
}
