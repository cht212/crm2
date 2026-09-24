using CRM.Data.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20260924130000_MensajeEntranteIdempotencia")]
public partial class MensajeEntranteIdempotencia : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            WITH duplicados AS
            (
                SELECT n_mensaje,
                       ROW_NUMBER() OVER (
                           PARTITION BY c_canal, c_direccion, c_external_id
                           ORDER BY n_mensaje) AS numero
                FROM crm_mensaje
                WHERE c_direccion = 'E'
                  AND c_external_id IS NOT NULL
            )
            DELETE FROM crm_mensaje
            WHERE n_mensaje IN
            (
                SELECT n_mensaje
                FROM duplicados
                WHERE numero > 1
            );
            """);

        migrationBuilder.AlterColumn<string>(
            name: "c_canal",
            table: "crm_mensaje",
            type: "nvarchar(32)",
            maxLength: 32,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "nvarchar(max)");

        migrationBuilder.AlterColumn<string>(
            name: "c_external_id",
            table: "crm_mensaje",
            type: "nvarchar(450)",
            maxLength: 450,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "nvarchar(max)",
            oldNullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_crm_mensaje_c_canal_c_direccion_c_external_id",
            table: "crm_mensaje",
            columns: new[] { "c_canal", "c_direccion", "c_external_id" },
            unique: true,
            filter: "[c_direccion] = 'E' AND [c_external_id] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_crm_mensaje_c_canal_c_direccion_c_external_id",
            table: "crm_mensaje");

        migrationBuilder.AlterColumn<string>(
            name: "c_external_id",
            table: "crm_mensaje",
            type: "nvarchar(max)",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "nvarchar(450)",
            oldMaxLength: 450,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "c_canal",
            table: "crm_mensaje",
            type: "nvarchar(max)",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "nvarchar(32)",
            oldMaxLength: 32);
    }
}
