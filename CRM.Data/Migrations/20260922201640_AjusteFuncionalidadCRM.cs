using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations
{
    /// <inheritdoc />
    public partial class AjusteFuncionalidadCRM : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "crm_campana",
                columns: table => new
                {
                    n_campana = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_descripcion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_tipo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    d_fecha_inicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    d_fecha_fin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    n_asignado_a = table.Column<int>(type: "int", nullable: true),
                    n_creado_por = table.Column<int>(type: "int", nullable: true),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_campana", x => x.n_campana);
                    table.ForeignKey(
                        name: "FK_crm_campana_crm_usuario_n_asignado_a",
                        column: x => x.n_asignado_a,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_crm_campana_crm_usuario_n_creado_por",
                        column: x => x.n_creado_por,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "crm_kpi_dashboard",
                columns: table => new
                {
                    n_kpi = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_tipo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_valor = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_meta = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_periodo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_kpi_dashboard", x => x.n_kpi);
                });

            migrationBuilder.CreateTable(
                name: "crm_regla_automatica",
                columns: table => new
                {
                    n_regla = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_entidad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_evento = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_condicion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_accion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_valor_accion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    n_asignado_a = table.Column<int>(type: "int", nullable: true),
                    n_creado_por = table.Column<int>(type: "int", nullable: true),
                    b_activa = table.Column<bool>(type: "bit", nullable: false),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_regla_automatica", x => x.n_regla);
                    table.ForeignKey(
                        name: "FK_crm_regla_automatica_crm_usuario_n_asignado_a",
                        column: x => x.n_asignado_a,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_crm_regla_automatica_crm_usuario_n_creado_por",
                        column: x => x.n_creado_por,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "crm_reporte_exportacion",
                columns: table => new
                {
                    n_reporte = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_tipo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_entidad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_ruta = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    n_creado_por = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_reporte_exportacion", x => x.n_reporte);
                    table.ForeignKey(
                        name: "FK_crm_reporte_exportacion_crm_usuario_n_creado_por",
                        column: x => x.n_creado_por,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "crm_campana_cliente",
                columns: table => new
                {
                    n_campana = table.Column<long>(type: "bigint", nullable: false),
                    n_cliente = table.Column<long>(type: "bigint", nullable: false),
                    d_fecha_asignacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_campana_cliente", x => new { x.n_campana, x.n_cliente });
                    table.ForeignKey(
                        name: "FK_crm_campana_cliente_crm_campana_n_campana",
                        column: x => x.n_campana,
                        principalTable: "crm_campana",
                        principalColumn: "n_campana",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_crm_campana_cliente_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_crm_campana_n_asignado_a",
                table: "crm_campana",
                column: "n_asignado_a");

            migrationBuilder.CreateIndex(
                name: "IX_crm_campana_n_creado_por",
                table: "crm_campana",
                column: "n_creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_crm_campana_cliente_n_cliente",
                table: "crm_campana_cliente",
                column: "n_cliente");

            migrationBuilder.CreateIndex(
                name: "IX_crm_regla_automatica_n_asignado_a",
                table: "crm_regla_automatica",
                column: "n_asignado_a");

            migrationBuilder.CreateIndex(
                name: "IX_crm_regla_automatica_n_creado_por",
                table: "crm_regla_automatica",
                column: "n_creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_crm_reporte_exportacion_n_creado_por",
                table: "crm_reporte_exportacion",
                column: "n_creado_por");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "crm_campana_cliente");

            migrationBuilder.DropTable(
                name: "crm_kpi_dashboard");

            migrationBuilder.DropTable(
                name: "crm_regla_automatica");

            migrationBuilder.DropTable(
                name: "crm_reporte_exportacion");

            migrationBuilder.DropTable(
                name: "crm_campana");
        }
    }
}
