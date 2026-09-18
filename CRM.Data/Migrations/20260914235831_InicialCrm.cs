using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.Data.Migrations
{
    /// <inheritdoc />
    public partial class InicialCrm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "crm_cliente",
                columns: table => new
                {
                    n_cliente = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_telefono = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_documento = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    d_fecha_registro = table.Column<DateTime>(type: "datetime2", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_cliente", x => x.n_cliente);
                });

            migrationBuilder.CreateTable(
                name: "crm_etiqueta",
                columns: table => new
                {
                    n_etiqueta = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_nombre = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    c_color = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_etiqueta", x => x.n_etiqueta);
                });

            migrationBuilder.CreateTable(
                name: "crm_usuario",
                columns: table => new
                {
                    n_usuario = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_usuario = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(1)", nullable: false),
                    c_password_hash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_rol = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_usuario", x => x.n_usuario);
                });

            migrationBuilder.CreateTable(
                name: "crm_cliente_etiqueta",
                columns: table => new
                {
                    n_cliente = table.Column<long>(type: "bigint", nullable: false),
                    n_etiqueta = table.Column<int>(type: "int", nullable: false),
                    d_fecha_asignacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_cliente_etiqueta", x => new { x.n_cliente, x.n_etiqueta });
                    table.ForeignKey(
                        name: "FK_crm_cliente_etiqueta_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_crm_cliente_etiqueta_crm_etiqueta_n_etiqueta",
                        column: x => x.n_etiqueta,
                        principalTable: "crm_etiqueta",
                        principalColumn: "n_etiqueta",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crm_actividad_log",
                columns: table => new
                {
                    n_actividad = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    c_entidad = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    n_entidad_id = table.Column<long>(type: "bigint", nullable: false),
                    c_accion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_valor_anterior = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_valor_nuevo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    n_usuario = table.Column<int>(type: "int", nullable: true),
                    d_fecha = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_actividad_log", x => x.n_actividad);
                    table.ForeignKey(
                        name: "FK_crm_actividad_log_crm_usuario_n_usuario",
                        column: x => x.n_usuario,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "crm_conversacion",
                columns: table => new
                {
                    n_conversacion = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    n_cliente = table.Column<long>(type: "bigint", nullable: false),
                    n_usuario_asignado = table.Column<int>(type: "int", nullable: true),
                    c_estado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    d_fecha_inicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    d_ultimo_mensaje = table.Column<DateTime>(type: "datetime2", nullable: true),
                    d_ultimo_mensaje_cliente = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_conversacion", x => x.n_conversacion);
                    table.ForeignKey(
                        name: "FK_crm_conversacion_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_crm_conversacion_crm_usuario_n_usuario_asignado",
                        column: x => x.n_usuario_asignado,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario");
                });

            migrationBuilder.CreateTable(
                name: "crm_mensaje",
                columns: table => new
                {
                    n_mensaje = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    n_conversacion = table.Column<long>(type: "bigint", nullable: false),
                    c_whatsapp_id = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_direccion = table.Column<string>(type: "nvarchar(1)", nullable: false),
                    c_tipo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    c_mensaje = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    d_fecha = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_mensaje", x => x.n_mensaje);
                    table.ForeignKey(
                        name: "FK_crm_mensaje_crm_conversacion_n_conversacion",
                        column: x => x.n_conversacion,
                        principalTable: "crm_conversacion",
                        principalColumn: "n_conversacion",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crm_nota_interna",
                columns: table => new
                {
                    n_nota = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    n_cliente = table.Column<long>(type: "bigint", nullable: false),
                    n_conversacion = table.Column<long>(type: "bigint", nullable: true),
                    c_texto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    n_creado_por = table.Column<int>(type: "int", nullable: false),
                    d_fecha = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_nota_interna", x => x.n_nota);
                    table.ForeignKey(
                        name: "FK_crm_nota_interna_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_nota_interna_crm_conversacion_n_conversacion",
                        column: x => x.n_conversacion,
                        principalTable: "crm_conversacion",
                        principalColumn: "n_conversacion",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_crm_nota_interna_crm_usuario_n_creado_por",
                        column: x => x.n_creado_por,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "crm_oportunidad",
                columns: table => new
                {
                    n_oportunidad = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    n_cliente = table.Column<long>(type: "bigint", nullable: false),
                    n_conversacion = table.Column<long>(type: "bigint", nullable: true),
                    n_usuario_asignado = table.Column<int>(type: "int", nullable: true),
                    c_titulo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    n_monto = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    c_moneda = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_etapa = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    n_probabilidad = table.Column<int>(type: "int", nullable: false),
                    d_fecha_cierre_estimada = table.Column<DateTime>(type: "datetime2", nullable: true),
                    d_fecha_cierre_real = table.Column<DateTime>(type: "datetime2", nullable: true),
                    c_motivo_perdida = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    d_fecha_actualizacion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    n_creado_por = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_oportunidad", x => x.n_oportunidad);
                    table.ForeignKey(
                        name: "FK_crm_oportunidad_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_oportunidad_crm_conversacion_n_conversacion",
                        column: x => x.n_conversacion,
                        principalTable: "crm_conversacion",
                        principalColumn: "n_conversacion",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_crm_oportunidad_crm_usuario_n_usuario_asignado",
                        column: x => x.n_usuario_asignado,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "crm_tarea",
                columns: table => new
                {
                    n_tarea = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    n_cliente = table.Column<long>(type: "bigint", nullable: true),
                    n_conversacion = table.Column<long>(type: "bigint", nullable: true),
                    n_oportunidad = table.Column<long>(type: "bigint", nullable: true),
                    c_titulo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    c_descripcion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    d_fecha_vencimiento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    c_estado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    n_asignado_a = table.Column<int>(type: "int", nullable: true),
                    n_creado_por = table.Column<int>(type: "int", nullable: true),
                    d_fecha_creacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    d_fecha_completada = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crm_tarea", x => x.n_tarea);
                    table.ForeignKey(
                        name: "FK_crm_tarea_crm_cliente_n_cliente",
                        column: x => x.n_cliente,
                        principalTable: "crm_cliente",
                        principalColumn: "n_cliente",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_crm_tarea_crm_conversacion_n_conversacion",
                        column: x => x.n_conversacion,
                        principalTable: "crm_conversacion",
                        principalColumn: "n_conversacion",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_crm_tarea_crm_oportunidad_n_oportunidad",
                        column: x => x.n_oportunidad,
                        principalTable: "crm_oportunidad",
                        principalColumn: "n_oportunidad",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_crm_tarea_crm_usuario_n_asignado_a",
                        column: x => x.n_asignado_a,
                        principalTable: "crm_usuario",
                        principalColumn: "n_usuario",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_crm_actividad_log_c_entidad_n_entidad_id",
                table: "crm_actividad_log",
                columns: new[] { "c_entidad", "n_entidad_id" });

            migrationBuilder.CreateIndex(
                name: "IX_crm_actividad_log_n_usuario",
                table: "crm_actividad_log",
                column: "n_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_crm_cliente_etiqueta_n_etiqueta",
                table: "crm_cliente_etiqueta",
                column: "n_etiqueta");

            migrationBuilder.CreateIndex(
                name: "IX_crm_conversacion_n_cliente",
                table: "crm_conversacion",
                column: "n_cliente");

            migrationBuilder.CreateIndex(
                name: "IX_crm_conversacion_n_usuario_asignado",
                table: "crm_conversacion",
                column: "n_usuario_asignado");

            migrationBuilder.CreateIndex(
                name: "IX_crm_etiqueta_c_nombre",
                table: "crm_etiqueta",
                column: "c_nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_crm_mensaje_n_conversacion",
                table: "crm_mensaje",
                column: "n_conversacion");

            migrationBuilder.CreateIndex(
                name: "IX_crm_nota_interna_n_cliente",
                table: "crm_nota_interna",
                column: "n_cliente");

            migrationBuilder.CreateIndex(
                name: "IX_crm_nota_interna_n_conversacion",
                table: "crm_nota_interna",
                column: "n_conversacion");

            migrationBuilder.CreateIndex(
                name: "IX_crm_nota_interna_n_creado_por",
                table: "crm_nota_interna",
                column: "n_creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_crm_oportunidad_n_cliente",
                table: "crm_oportunidad",
                column: "n_cliente");

            migrationBuilder.CreateIndex(
                name: "IX_crm_oportunidad_n_conversacion",
                table: "crm_oportunidad",
                column: "n_conversacion");

            migrationBuilder.CreateIndex(
                name: "IX_crm_oportunidad_n_usuario_asignado",
                table: "crm_oportunidad",
                column: "n_usuario_asignado");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tarea_n_asignado_a",
                table: "crm_tarea",
                column: "n_asignado_a");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tarea_n_cliente",
                table: "crm_tarea",
                column: "n_cliente");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tarea_n_conversacion",
                table: "crm_tarea",
                column: "n_conversacion");

            migrationBuilder.CreateIndex(
                name: "IX_crm_tarea_n_oportunidad",
                table: "crm_tarea",
                column: "n_oportunidad");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "crm_actividad_log");

            migrationBuilder.DropTable(
                name: "crm_cliente_etiqueta");

            migrationBuilder.DropTable(
                name: "crm_mensaje");

            migrationBuilder.DropTable(
                name: "crm_nota_interna");

            migrationBuilder.DropTable(
                name: "crm_tarea");

            migrationBuilder.DropTable(
                name: "crm_etiqueta");

            migrationBuilder.DropTable(
                name: "crm_oportunidad");

            migrationBuilder.DropTable(
                name: "crm_conversacion");

            migrationBuilder.DropTable(
                name: "crm_cliente");

            migrationBuilder.DropTable(
                name: "crm_usuario");
        }
    }
}
