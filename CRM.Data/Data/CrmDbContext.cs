using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Data
{
    public class CrmDbContext : DbContext
    {
        public CrmDbContext(DbContextOptions<CrmDbContext> options) : base(options)
        {
        }

        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Conversacion> Conversaciones { get; set; }
        public DbSet<Mensaje> Mensajes { get; set; }
        public DbSet<CrmUsuario> Usuarios { get; set; }
        public DbSet<Etiqueta> Etiquetas { get; set; }
        public DbSet<ClienteEtiqueta> ClienteEtiquetas { get; set; }
        public DbSet<Oportunidad> Oportunidades { get; set; }
        public DbSet<Tarea> Tareas { get; set; }
        public DbSet<NotaInterna> NotasInternas { get; set; }
        public DbSet<ActividadLog> ActividadLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Mapeo de nombres de tablas exactos en SQL Server según nuestro diseño inicial
            modelBuilder.Entity<Cliente>().ToTable("crm_cliente");
            modelBuilder.Entity<Cliente>().HasKey(c => c.nCliente);
            modelBuilder.Entity<Cliente>().Property(c => c.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<Cliente>().Property(c => c.cNombre).HasColumnName("c_nombre");
            modelBuilder.Entity<Cliente>().Property(c => c.cTelefono).HasColumnName("c_telefono");
            modelBuilder.Entity<Cliente>().Property(c => c.cEmail).HasColumnName("c_email");
            modelBuilder.Entity<Cliente>().Property(c => c.cDocumento).HasColumnName("c_documento");
            modelBuilder.Entity<Cliente>().Property(c => c.cFotoPerfilUrl).HasColumnName("c_foto_perfil_url");
            modelBuilder.Entity<Cliente>().Property(c => c.cCanalOrigen).HasColumnName("c_canal_origen");
            modelBuilder.Entity<Cliente>().Property(c => c.dFechaRegistro).HasColumnName("d_fecha_registro");
            modelBuilder.Entity<Cliente>().Property(c => c.cEstado).HasColumnName("c_estado");

            modelBuilder.Entity<Conversacion>().ToTable("crm_conversacion");
            modelBuilder.Entity<Conversacion>().HasKey(c => c.nConversacion);
            modelBuilder.Entity<Conversacion>().Property(c => c.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<Conversacion>().Property(c => c.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<Conversacion>().Property(c => c.nUsuarioAsignado).HasColumnName("n_usuario_asignado");
            modelBuilder.Entity<Conversacion>().Property(c => c.cEstado).HasColumnName("c_estado");
            modelBuilder.Entity<Conversacion>().Property(c => c.cCanal).HasColumnName("c_canal");
            modelBuilder.Entity<Conversacion>().Property(c => c.cExternalThreadId).HasColumnName("c_external_thread_id");
            modelBuilder.Entity<Conversacion>().Property(c => c.cBotEstado).HasColumnName("c_bot_estado");
            modelBuilder.Entity<Conversacion>().Property(c => c.dFechaInicio).HasColumnName("d_fecha_inicio");
            modelBuilder.Entity<Conversacion>().Property(c => c.dUltimoMensaje).HasColumnName("d_ultimo_mensaje");
            modelBuilder.Entity<Conversacion>().Property(c => c.dUltimoMensajeCliente).HasColumnName("d_ultimo_mensaje_cliente");
            modelBuilder.Entity<Conversacion>().Property(c => c.dBotPausadoDesde).HasColumnName("d_bot_pausado_desde");
            modelBuilder.Entity<Conversacion>().Property(c => c.nBotPausadoPor).HasColumnName("n_bot_pausado_por");

            modelBuilder.Entity<Conversacion>()
                .HasOne(c => c.Cliente)
                .WithMany(cl => cl.Conversaciones)
                .HasForeignKey(c => c.nCliente);

            modelBuilder.Entity<Conversacion>()
                .HasOne(c => c.UsuarioAsignado)
                .WithMany(u => u.ConversacionesAsignadas)
                .HasForeignKey(c => c.nUsuarioAsignado);

            modelBuilder.Entity<Mensaje>().ToTable("crm_mensaje");
            modelBuilder.Entity<Mensaje>().HasKey(m => m.nMensaje);
            modelBuilder.Entity<Mensaje>().Property(m => m.nMensaje).HasColumnName("n_mensaje");
            modelBuilder.Entity<Mensaje>().Property(m => m.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<Mensaje>().Property(m => m.cWhatsappId).HasColumnName("c_whatsapp_id");
            modelBuilder.Entity<Mensaje>().Property(m => m.cCanal).HasColumnName("c_canal");
            modelBuilder.Entity<Mensaje>().Property(m => m.cExternalId).HasColumnName("c_external_id");
            modelBuilder.Entity<Mensaje>().Property(m => m.cDireccion).HasColumnName("c_direccion");
            modelBuilder.Entity<Mensaje>().Property(m => m.cTipo).HasColumnName("c_tipo");
            modelBuilder.Entity<Mensaje>().Property(m => m.cMensaje).HasColumnName("c_mensaje");
            modelBuilder.Entity<Mensaje>().Property(m => m.cEstado).HasColumnName("c_estado");
            modelBuilder.Entity<Mensaje>().Property(m => m.dFecha).HasColumnName("d_fecha");

            modelBuilder.Entity<Mensaje>()
                .HasOne(m => m.Conversacion)
                .WithMany(c => c.Mensajes)
                .HasForeignKey(m => m.nConversacion);

            modelBuilder.Entity<CrmUsuario>().ToTable("crm_usuario");
            modelBuilder.Entity<CrmUsuario>().HasKey(u => u.nUsuario);
            modelBuilder.Entity<CrmUsuario>().Property(u => u.nUsuario).HasColumnName("n_usuario");
            modelBuilder.Entity<CrmUsuario>().Property(u => u.cUsuario).HasColumnName("c_usuario");
            modelBuilder.Entity<CrmUsuario>().Property(u => u.cNombre).HasColumnName("c_nombre");
            modelBuilder.Entity<CrmUsuario>().Property(u => u.cEstado).HasColumnName("c_estado");
            modelBuilder.Entity<CrmUsuario>().Property(u => u.cPasswordHash).HasColumnName("c_password_hash");
            modelBuilder.Entity<CrmUsuario>().Property(u => u.cRol).HasColumnName("c_rol");

            // =====================================================
            // ETIQUETAS (segmentación de clientes)
            // =====================================================

            modelBuilder.Entity<Etiqueta>().ToTable("crm_etiqueta");
            modelBuilder.Entity<Etiqueta>().HasKey(e => e.nEtiqueta);
            modelBuilder.Entity<Etiqueta>().Property(e => e.nEtiqueta).HasColumnName("n_etiqueta");
            modelBuilder.Entity<Etiqueta>().Property(e => e.cNombre).HasColumnName("c_nombre");
            modelBuilder.Entity<Etiqueta>().Property(e => e.cColor).HasColumnName("c_color");
            modelBuilder.Entity<Etiqueta>().HasIndex(e => e.cNombre).IsUnique();

            modelBuilder.Entity<ClienteEtiqueta>().ToTable("crm_cliente_etiqueta");
            modelBuilder.Entity<ClienteEtiqueta>().HasKey(ce => new { ce.nCliente, ce.nEtiqueta });
            modelBuilder.Entity<ClienteEtiqueta>().Property(ce => ce.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<ClienteEtiqueta>().Property(ce => ce.nEtiqueta).HasColumnName("n_etiqueta");
            modelBuilder.Entity<ClienteEtiqueta>().Property(ce => ce.dFechaAsignacion).HasColumnName("d_fecha_asignacion");
            modelBuilder.Entity<ClienteEtiqueta>()
                .HasOne(ce => ce.Cliente)
                .WithMany()
                .HasForeignKey(ce => ce.nCliente);
            modelBuilder.Entity<ClienteEtiqueta>()
                .HasOne(ce => ce.Etiqueta)
                .WithMany(e => e.Clientes)
                .HasForeignKey(ce => ce.nEtiqueta);

            // =====================================================
            // OPORTUNIDADES (embudo de ventas real)
            // =====================================================

            modelBuilder.Entity<Oportunidad>().ToTable("crm_oportunidad");
            modelBuilder.Entity<Oportunidad>().HasKey(o => o.nOportunidad);
            modelBuilder.Entity<Oportunidad>().Property(o => o.nOportunidad).HasColumnName("n_oportunidad");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nUsuarioAsignado).HasColumnName("n_usuario_asignado");
            modelBuilder.Entity<Oportunidad>().Property(o => o.cTitulo).HasColumnName("c_titulo");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nMonto).HasColumnName("n_monto").HasColumnType("decimal(12,2)");
            modelBuilder.Entity<Oportunidad>().Property(o => o.cMoneda).HasColumnName("c_moneda");
            modelBuilder.Entity<Oportunidad>().Property(o => o.cEtapa).HasColumnName("c_etapa");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nProbabilidad).HasColumnName("n_probabilidad");
            modelBuilder.Entity<Oportunidad>().Property(o => o.dFechaCierreEstimada).HasColumnName("d_fecha_cierre_estimada");
            modelBuilder.Entity<Oportunidad>().Property(o => o.dFechaCierreReal).HasColumnName("d_fecha_cierre_real");
            modelBuilder.Entity<Oportunidad>().Property(o => o.cMotivoPerdida).HasColumnName("c_motivo_perdida");
            modelBuilder.Entity<Oportunidad>().Property(o => o.dFechaCreacion).HasColumnName("d_fecha_creacion");
            modelBuilder.Entity<Oportunidad>().Property(o => o.dFechaActualizacion).HasColumnName("d_fecha_actualizacion");
            modelBuilder.Entity<Oportunidad>().Property(o => o.nCreadoPor).HasColumnName("n_creado_por");

            modelBuilder.Entity<Oportunidad>()
                .HasOne(o => o.Cliente)
                .WithMany()
                .HasForeignKey(o => o.nCliente)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Oportunidad>()
                .HasOne(o => o.Conversacion)
                .WithMany()
                .HasForeignKey(o => o.nConversacion)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Oportunidad>()
                .HasOne(o => o.UsuarioAsignado)
                .WithMany()
                .HasForeignKey(o => o.nUsuarioAsignado)
                .OnDelete(DeleteBehavior.SetNull);

            // =====================================================
            // TAREAS (recordatorios / seguimientos)
            // =====================================================

            modelBuilder.Entity<Tarea>().ToTable("crm_tarea");
            modelBuilder.Entity<Tarea>().HasKey(t => t.nTarea);
            modelBuilder.Entity<Tarea>().Property(t => t.nTarea).HasColumnName("n_tarea");
            modelBuilder.Entity<Tarea>().Property(t => t.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<Tarea>().Property(t => t.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<Tarea>().Property(t => t.nOportunidad).HasColumnName("n_oportunidad");
            modelBuilder.Entity<Tarea>().Property(t => t.cTitulo).HasColumnName("c_titulo");
            modelBuilder.Entity<Tarea>().Property(t => t.cDescripcion).HasColumnName("c_descripcion");
            modelBuilder.Entity<Tarea>().Property(t => t.dFechaVencimiento).HasColumnName("d_fecha_vencimiento");
            modelBuilder.Entity<Tarea>().Property(t => t.cEstado).HasColumnName("c_estado");
            modelBuilder.Entity<Tarea>().Property(t => t.nAsignadoA).HasColumnName("n_asignado_a");
            modelBuilder.Entity<Tarea>().Property(t => t.nCreadoPor).HasColumnName("n_creado_por");
            modelBuilder.Entity<Tarea>().Property(t => t.dFechaCreacion).HasColumnName("d_fecha_creacion");
            modelBuilder.Entity<Tarea>().Property(t => t.dFechaCompletada).HasColumnName("d_fecha_completada");

            modelBuilder.Entity<Tarea>()
                .HasOne(t => t.Cliente)
                .WithMany()
                .HasForeignKey(t => t.nCliente)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<Tarea>()
                .HasOne(t => t.Conversacion)
                .WithMany()
                .HasForeignKey(t => t.nConversacion)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Tarea>()
                .HasOne(t => t.Oportunidad)
                .WithMany()
                .HasForeignKey(t => t.nOportunidad)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<Tarea>()
                .HasOne(t => t.AsignadoA)
                .WithMany()
                .HasForeignKey(t => t.nAsignadoA)
                .OnDelete(DeleteBehavior.SetNull);

            // =====================================================
            // NOTAS INTERNAS
            // =====================================================

            modelBuilder.Entity<NotaInterna>().ToTable("crm_nota_interna");
            modelBuilder.Entity<NotaInterna>().HasKey(n => n.nNota);
            modelBuilder.Entity<NotaInterna>().Property(n => n.nNota).HasColumnName("n_nota");
            modelBuilder.Entity<NotaInterna>().Property(n => n.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<NotaInterna>().Property(n => n.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<NotaInterna>().Property(n => n.cTexto).HasColumnName("c_texto");
            modelBuilder.Entity<NotaInterna>().Property(n => n.nCreadoPor).HasColumnName("n_creado_por");
            modelBuilder.Entity<NotaInterna>().Property(n => n.dFecha).HasColumnName("d_fecha");

            modelBuilder.Entity<NotaInterna>()
                .HasOne(n => n.Cliente)
                .WithMany()
                .HasForeignKey(n => n.nCliente)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<NotaInterna>()
                .HasOne(n => n.Conversacion)
                .WithMany()
                .HasForeignKey(n => n.nConversacion)
                .OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<NotaInterna>()
                .HasOne(n => n.CreadoPor)
                .WithMany()
                .HasForeignKey(n => n.nCreadoPor)
                .OnDelete(DeleteBehavior.Restrict);

            // =====================================================
            // AUDITORÍA (activity log)
            // =====================================================

            modelBuilder.Entity<ActividadLog>().ToTable("crm_actividad_log");
            modelBuilder.Entity<ActividadLog>().HasKey(a => a.nActividad);
            modelBuilder.Entity<ActividadLog>().Property(a => a.nActividad).HasColumnName("n_actividad");
            modelBuilder.Entity<ActividadLog>().Property(a => a.cEntidad).HasColumnName("c_entidad");
            modelBuilder.Entity<ActividadLog>().Property(a => a.nEntidadId).HasColumnName("n_entidad_id");
            modelBuilder.Entity<ActividadLog>().Property(a => a.cAccion).HasColumnName("c_accion");
            modelBuilder.Entity<ActividadLog>().Property(a => a.cValorAnterior).HasColumnName("c_valor_anterior");
            modelBuilder.Entity<ActividadLog>().Property(a => a.cValorNuevo).HasColumnName("c_valor_nuevo");
            modelBuilder.Entity<ActividadLog>().Property(a => a.nUsuario).HasColumnName("n_usuario");
            modelBuilder.Entity<ActividadLog>().Property(a => a.dFecha).HasColumnName("d_fecha");
            modelBuilder.Entity<ActividadLog>().HasIndex(a => new { a.cEntidad, a.nEntidadId });

            modelBuilder.Entity<ActividadLog>()
                .HasOne(a => a.Usuario)
                .WithMany()
                .HasForeignKey(a => a.nUsuario)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
