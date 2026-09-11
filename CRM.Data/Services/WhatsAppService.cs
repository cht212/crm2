using CRM.Data.Data;
using CRM.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CRM.Data.Services
{
    public class WhatsAppService
    {
        private readonly CrmDbContext _context;
        private readonly WhatsAppCloudApiService _whatsAppCloudApiService;
        private readonly ILogger<WhatsAppService> _logger;

        public WhatsAppService(
            CrmDbContext context,
            WhatsAppCloudApiService whatsAppCloudApiService,
            ILogger<WhatsAppService> logger)
        {
            _context = context;
            _whatsAppCloudApiService = whatsAppCloudApiService;
            _logger = logger;
        }

        // =========================================================
        // MENSAJE ENTRANTE
        // =========================================================

        public async Task<long> ProcesarMensajeEntranteAsync(
            string telefono,
            string? nombre,
            string mensaje,
            string tipo,
            string? whatsappId)
        {
            telefono = telefono.Trim();

            // =====================================================
            // 1. EVITAR MENSAJES DUPLICADOS
            // =====================================================

            if (!string.IsNullOrWhiteSpace(whatsappId))
            {
                bool mensajeExiste =
                    await _context.Mensajes
                        .AnyAsync(m => m.cWhatsappId == whatsappId);

                if (mensajeExiste)
                {
                    _logger.LogInformation(
                        "Mensaje duplicado ignorado: {WhatsappId}",
                        whatsappId);

                    var mensajeExistente =
                        await _context.Mensajes
                            .AsNoTracking()
                            .FirstAsync(m => m.cWhatsappId == whatsappId);

                    return mensajeExistente.nConversacion;
                }
            }

            // =====================================================
            // 2. BUSCAR CLIENTE
            // =====================================================

            Cliente? cliente =
                await _context.Clientes
                    .FirstOrDefaultAsync(c =>
                        c.cTelefono == telefono);

            // =====================================================
            // 3. CREAR CLIENTE SI NO EXISTE
            // =====================================================

            if (cliente == null)
            {
                cliente = new Cliente
                {
                    cNombre =
                        string.IsNullOrWhiteSpace(nombre)
                            ? telefono
                            : nombre.Trim(),

                    cTelefono = telefono,

                    dFechaRegistro = DateTime.Now,

                    cEstado = 'A'
                };

                _context.Clientes.Add(cliente);

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Cliente creado: {ClienteId}",
                    cliente.nCliente);
            }
            else
            {
                // Si Meta nos manda un nombre nuevo,
                // podemos actualizarlo.

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    cliente.cNombre = nombre.Trim();
                }
            }

            // =====================================================
            // 4. BUSCAR CONVERSACIÓN ABIERTA
            // =====================================================

            Conversacion? conversacion =
                await _context.Conversaciones
                    .Where(c =>
                        c.nCliente == cliente.nCliente &&
                        (
                            c.cEstado == "NUEVO" ||
                            c.cEstado == "ABIERTO"
                        ))
                    .OrderByDescending(
                        c => c.dUltimoMensaje)
                    .FirstOrDefaultAsync();

            // =====================================================
            // 5. CREAR CONVERSACIÓN
            // =====================================================

            if (conversacion == null)
            {
                conversacion = new Conversacion
                {
                    nCliente = cliente.nCliente,

                    cEstado = "NUEVO",

                    dFechaInicio = DateTime.Now,

                    dUltimoMensaje = DateTime.Now,

                    dUltimoMensajeCliente = DateTime.Now
                };

                _context.Conversaciones.Add(conversacion);

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Conversación creada: {ConversacionId}",
                    conversacion.nConversacion);
            }
            else
            {
                // =================================================
                // Actualizar conversación
                // =================================================

                conversacion.dUltimoMensaje =
                    DateTime.Now;

                conversacion.dUltimoMensajeCliente =
                    DateTime.Now;
            }

            // =====================================================
            // 6. CREAR MENSAJE
            // =====================================================

            var nuevoMensaje = new Mensaje
            {
                nConversacion =
                    conversacion.nConversacion,

                cWhatsappId =
                    whatsappId,

                cDireccion = 'E',

                cTipo = tipo,

                cEstado = "RECIBIDO",

                cMensaje = mensaje,

                dFecha = DateTime.Now
            };

            _context.Mensajes.Add(nuevoMensaje);

            // =====================================================
            // 7. GUARDAR
            // =====================================================

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Mensaje entrante guardado. " +
                "Conversación: {ConversacionId}, " +
                "Mensaje: {MensajeId}",
                conversacion.nConversacion,
                nuevoMensaje.nMensaje);

            return conversacion.nConversacion;
        }

        // =========================================================
        // HISTORIAL POR TELÉFONO
        // =========================================================

        public async Task<object?> ObtenerHistorialPorTelefonoAsync(
            string telefono)
        {
            telefono = telefono.Trim();

            Cliente? cliente =
                await _context.Clientes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c =>
                        c.cTelefono == telefono);

            if (cliente == null)
            {
                return new List<object>();
            }

            var mensajes =
                await _context.Mensajes
                    .AsNoTracking()
                    .Where(m =>
                        _context.Conversaciones
                            .Any(c =>
                                c.nConversacion == m.nConversacion &&
                                c.nCliente == cliente.nCliente))
                    .OrderBy(m => m.dFecha)
                    .Take(100)
                    .Select(m => new
                    {
                        id = m.nMensaje,

                        conversacionId =
                            m.nConversacion,

                        whatsappId =
                            m.cWhatsappId,

                        direccion =
                            m.cDireccion,

                        tipo =
                            m.cTipo,

                        estado =
                            m.cEstado,

                        mensaje =
                            m.cMensaje,

                        fecha =
                            m.dFecha
                    })
                    .ToListAsync();

            return mensajes;
        }

        // =========================================================
        // OBTENER CONVERSACIÓN
        // =========================================================

        public async Task<object?> ObtenerConversacionAsync(
            long conversacionId)
        {
            var conversacion =
                await _context.Conversaciones
                    .AsNoTracking()
                    .Include(c => c.Cliente)
                    .Include(c => c.UsuarioAsignado)
                    .FirstOrDefaultAsync(c =>
                        c.nConversacion == conversacionId);

            if (conversacion == null)
            {
                return null;
            }

            var mensajes =
                await _context.Mensajes
                    .AsNoTracking()
                    .Where(m =>
                        m.nConversacion == conversacionId)
                    .OrderBy(m => m.dFecha)
                    .ToListAsync();

            return new
            {
                id = conversacion.nConversacion,

                cliente = new
                {
                    id = conversacion.Cliente.nCliente,

                    nombre =
                        conversacion.Cliente.cNombre,

                    telefono =
                        conversacion.Cliente.cTelefono,

                    email =
                        conversacion.Cliente.cEmail,

                    documento =
                        conversacion.Cliente.cDocumento
                },

                estado =
                    conversacion.cEstado,

                usuarioAsignado =
                    conversacion.UsuarioAsignado == null
                        ? null
                        : new
                        {
                            id =
                                conversacion.UsuarioAsignado.nUsuario,

                            usuario =
                                conversacion.UsuarioAsignado.cUsuario,

                            nombre =
                                conversacion.UsuarioAsignado.cNombre
                        },

                fechaCreacion =
                    conversacion.dFechaInicio,

                ultimoMensaje =
                    conversacion.dUltimoMensaje,

                ultimoMensajeCliente =
                    conversacion.dUltimoMensajeCliente,

                mensajes =
                    mensajes.Select(m => new
                    {
                        id = m.nMensaje,

                        whatsappId =
                            m.cWhatsappId,

                        direccion =
                            m.cDireccion,

                        tipo =
                            m.cTipo,

                        estado =
                            m.cEstado,

                        mensaje =
                            m.cMensaje,

                        fecha =
                            m.dFecha
                    })
            };
        }

        // =========================================================
        // TODAS LAS CONVERSACIONES
        // =========================================================

        public async Task<object> ObtenerTodasConversacionesAsync()
        {
            var conversaciones =
                await _context.Conversaciones
                    .AsNoTracking()
                    .Include(c => c.Cliente)
                    .Include(c => c.UsuarioAsignado)
                    .OrderByDescending(
                        c => c.dUltimoMensaje)
                    .Select(c => new
                    {
                        id =
                            c.nConversacion,

                        clienteId =
                            c.nCliente,

                        telefono =
                            c.Cliente.cTelefono,

                        nombre =
                            c.Cliente.cNombre,

                        estado =
                            c.cEstado,

                        usuarioAsignado =
                            c.UsuarioAsignado == null
                                ? null
                                : c.UsuarioAsignado.cNombre,

                        ultimoMensaje =
                            c.dUltimoMensaje,

                        ultimoMensajeCliente =
                            c.dUltimoMensajeCliente
                    })
                    .ToListAsync();

            return conversaciones;
        }

        // =========================================================
        // MENSAJE SALIENTE
        // =========================================================
        //
        // Con SendMessagesToMeta=false se conserva la prueba local.
        // Con SendMessagesToMeta=true se envía por WhatsApp Cloud API antes
        // de guardar el mensaje como enviado.
        //
        // =========================================================

        public async Task<long> ProcesarMensajeSalienteAsync(
            long conversacionId,
            string mensaje,
            long? usuarioId,
            string tipo,
            string? whatsappId)
        {
            Conversacion? conversacion =
                await _context.Conversaciones
                    .Include(c => c.Cliente)
                    .FirstOrDefaultAsync(c =>
                        c.nConversacion == conversacionId);

            if (conversacion == null)
            {
                throw new InvalidOperationException(
                    "La conversación no existe.");
            }

            // =====================================================
            // Si el asesor responde,
            // la conversación queda abierta
            // =====================================================

            conversacion.cEstado = "ABIERTO";

            conversacion.dUltimoMensaje =
                DateTime.Now;

            if (usuarioId.HasValue)
            {
                // El modelo usa int?, mientras que
                // el método recibe long?.
                conversacion.nUsuarioAsignado =
                    (int)usuarioId.Value;
            }

            if (_whatsAppCloudApiService.ShouldSendToMeta)
            {
                whatsappId = await EnviarAMetaAsync(
                    conversacion.Cliente.cTelefono,
                    mensaje,
                    tipo,
                    whatsappId);
            }

            // =====================================================
            // Crear mensaje
            // =====================================================

            var nuevoMensaje = new Mensaje
            {
                nConversacion =
                    conversacion.nConversacion,

                cWhatsappId =
                    whatsappId,

                cDireccion = 'S',

                cTipo = tipo,

                cEstado = "ENVIADO",

                cMensaje = mensaje,

                dFecha = DateTime.Now
            };

            _context.Mensajes.Add(nuevoMensaje);

            // =====================================================
            // GUARDAR
            // =====================================================

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Mensaje saliente guardado. " +
                "Conversación: {ConversacionId}, " +
                "Mensaje: {MensajeId}",
                conversacionId,
                nuevoMensaje.nMensaje);

            return nuevoMensaje.nMensaje;
        }

        private async Task<string?> EnviarAMetaAsync(
            string telefono,
            string mensaje,
            string tipo,
            string? whatsappId)
        {
            if (tipo.Equals("text", StringComparison.OrdinalIgnoreCase))
            {
                return await _whatsAppCloudApiService.SendTextMessageAsync(
                    telefono,
                    mensaje);
            }

            if (TryReadAttachment(mensaje, out var url, out var nombre))
            {
                return await _whatsAppCloudApiService.SendMediaMessageAsync(
                    telefono,
                    tipo,
                    url,
                    nombre,
                    null);
            }

            return whatsappId;
        }

        private static bool TryReadAttachment(
            string mensaje,
            out string url,
            out string? nombre)
        {
            url = string.Empty;
            nombre = null;

            try
            {
                using var json = JsonDocument.Parse(mensaje);
                var root = json.RootElement;

                if (root.TryGetProperty("url", out var urlProperty))
                {
                    url = urlProperty.GetString() ?? string.Empty;
                }

                if (root.TryGetProperty("nombre", out var nombreProperty))
                {
                    nombre = nombreProperty.GetString();
                }

                return !string.IsNullOrWhiteSpace(url);
            }
            catch (JsonException)
            {
                return false;
            }
        }
    }
}
