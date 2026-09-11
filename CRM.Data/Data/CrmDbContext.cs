using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

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
            modelBuilder.Entity<Cliente>().Property(c => c.dFechaRegistro).HasColumnName("d_fecha_registro");
            modelBuilder.Entity<Cliente>().Property(c => c.cEstado).HasColumnName("c_estado");

            modelBuilder.Entity<Conversacion>().ToTable("crm_conversacion");
            modelBuilder.Entity<Conversacion>().HasKey(c => c.nConversacion);
            modelBuilder.Entity<Conversacion>().Property(c => c.nConversacion).HasColumnName("n_conversacion");
            modelBuilder.Entity<Conversacion>().Property(c => c.nCliente).HasColumnName("n_cliente");
            modelBuilder.Entity<Conversacion>().Property(c => c.nUsuarioAsignado).HasColumnName("n_usuario_asignado");
            modelBuilder.Entity<Conversacion>().Property(c => c.cEstado).HasColumnName("c_estado");
            modelBuilder.Entity<Conversacion>().Property(c => c.dFechaInicio).HasColumnName("d_fecha_inicio");
            modelBuilder.Entity<Conversacion>().Property(c => c.dUltimoMensaje).HasColumnName("d_ultimo_mensaje");
            modelBuilder.Entity<Conversacion>().Property(c => c.dUltimoMensajeCliente).HasColumnName("d_ultimo_mensaje_cliente");

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
        }
    }
}