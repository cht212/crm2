using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Security.Claims;
using CRM.Data.Data;
using CRM.Data.Models;
using CRM.Data.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRM.Data.Controllers;

// =========================================================
// OPORTUNIDADES (embudo de ventas)
// =========================================================
//
// Antes, el "pipeline" del CRM solo reflejaba el estado de
// atención de la conversación (NUEVO/ABIERTO/CERRADO/PERDIDO),
// sin monto, etapa comercial ni probabilidad de cierre. Este
// controlador agrega el embudo de ventas real.
//
// =========================================================

[ApiController]
[Route("api/oportunidades")]
[Authorize(Roles = "Administrador,Supervisor,Asesor")]
public class OportunidadesController : ControllerBase
{
    private static readonly string[] EtapasValidas =
        { "NUEVA", "CALIFICADA", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA" };

    private readonly CrmDbContext _context;
    private readonly AuditoriaService _auditoria;

    public OportunidadesController(CrmDbContext context, AuditoriaService auditoria)
    {
        _context = context;
        _auditoria = auditoria;
    }

    private int? UsuarioActualId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? etapa = null,
        [FromQuery] long? clienteId = null,
        [FromQuery] long? conversacionId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 50 : pageSize;

        var query = _context.Oportunidades.AsNoTracking().AsQueryable();
        if (clienteId.HasValue) query = query.Where(o => o.nCliente == clienteId.Value);
        if (conversacionId.HasValue) query = query.Where(o => o.nConversacion == conversacionId.Value);
        if (!string.IsNullOrWhiteSpace(etapa))
        {
            query = query.Where(o => o.cEtapa == etapa.Trim().ToUpperInvariant());
        }

        var total = await query.CountAsync();

        var items = await query
            .Include(o => o.Cliente)
            .Include(o => o.UsuarioAsignado)
            .OrderByDescending(o => o.dFechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                id = o.nOportunidad,
                titulo = o.cTitulo,
                monto = o.nMonto,
                moneda = o.cMoneda,
                etapa = o.cEtapa,
                probabilidad = o.nProbabilidad,
                fechaCierreEstimada = o.dFechaCierreEstimada,
                conversacionId = o.nConversacion,
                cliente = new { id = o.Cliente.nCliente, nombre = o.Cliente.cNombre },
                asesor = o.UsuarioAsignado == null ? null : o.UsuarioAsignado.cNombre,
                asesorId = o.nUsuarioAsignado
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar([FromQuery] string? etapa = null)
    {
        var query = _context.Oportunidades.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(etapa) && !etapa.Equals("TODAS", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(o => o.cEtapa == etapa.Trim().ToUpperInvariant());
        }

        var filas = await query
            .Include(o => o.Cliente)
            .Include(o => o.UsuarioAsignado)
            .OrderByDescending(o => o.dFechaCreacion)
            .Select(o => new string?[]
            {
                o.cTitulo,
                o.Cliente.cNombre,
                o.nMonto.ToString(),
                o.cMoneda,
                o.cEtapa,
                o.nProbabilidad.ToString(),
                o.UsuarioAsignado == null ? null : o.UsuarioAsignado.cNombre,
                o.dFechaCreacion.ToString(),
                o.dFechaCierreEstimada == null ? null : o.dFechaCierreEstimada.Value.ToString(),
                o.dFechaCierreReal == null ? null : o.dFechaCierreReal.Value.ToString(),
                o.cMotivoPerdida
            })
            .ToListAsync();

        return CsvFile("oportunidades-crm.csv", new[] { "Titulo", "Cliente", "Monto", "Moneda", "Etapa", "Probabilidad", "Asesor", "Creacion", "Cierre estimado", "Cierre real", "Motivo perdida" }, filas);
    }
    // Vista resumida del embudo: monto total y cantidad por etapa
    [HttpGet("resumen")]
    public async Task<IActionResult> Resumen()
    {
        var resumen = await _context.Oportunidades
            .AsNoTracking()
            .GroupBy(o => o.cEtapa)
            .Select(g => new
            {
                etapa = g.Key,
                cantidad = g.Count(),
                montoTotal = g.Sum(o => o.nMonto)
            })
            .ToListAsync();

        return Ok(resumen);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearOportunidadDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var clienteExiste = await _context.Clientes.AnyAsync(c => c.nCliente == dto.ClienteId);
        if (!clienteExiste) return BadRequest("El cliente no existe.");

        var oportunidad = new Oportunidad
        {
            nCliente = dto.ClienteId,
            nConversacion = dto.ConversacionId,
            nUsuarioAsignado = dto.UsuarioAsignadoId,
            cTitulo = dto.Titulo!.Trim(),
            nMonto = dto.Monto,
            cMoneda = string.IsNullOrWhiteSpace(dto.Moneda) ? "PEN" : dto.Moneda.Trim().ToUpperInvariant(),
            cEtapa = "NUEVA",
            nProbabilidad = dto.Probabilidad ?? 10,
            dFechaCierreEstimada = dto.FechaCierreEstimada,
            nCreadoPor = UsuarioActualId,
            dFechaCreacion = DateTime.Now
        };

        _context.Oportunidades.Add(oportunidad);
        await _context.SaveChangesAsync();

        await _auditoria.RegistrarAsync("Oportunidad", oportunidad.nOportunidad, "CREACION", null,
            oportunidad.cTitulo, UsuarioActualId);

        return Ok(new { success = true, id = oportunidad.nOportunidad });
    }

    [HttpPut("{id:long}/etapa")]
    public async Task<IActionResult> CambiarEtapa(long id, [FromBody] CambiarEtapaDto dto)
    {
        var etapa = (dto.Etapa ?? string.Empty).Trim().ToUpperInvariant();
        if (!EtapasValidas.Contains(etapa)) return BadRequest("Etapa no válida.");

        var oportunidad = await _context.Oportunidades.FindAsync(id);
        if (oportunidad == null) return NotFound("Oportunidad no encontrada.");

        if (etapa == "PERDIDA" && string.IsNullOrWhiteSpace(dto.MotivoPerdida))
        {
            return BadRequest("Debes indicar el motivo de la pérdida.");
        }

        var etapaAnterior = oportunidad.cEtapa;
        oportunidad.cEtapa = etapa;
        oportunidad.dFechaActualizacion = DateTime.Now;

        if (etapa is "GANADA" or "PERDIDA")
        {
            oportunidad.dFechaCierreReal = DateTime.Now;
            oportunidad.nProbabilidad = etapa == "GANADA" ? 100 : 0;
            oportunidad.cMotivoPerdida = etapa == "PERDIDA" ? dto.MotivoPerdida!.Trim() : null;
        }

        await _context.SaveChangesAsync();
        await _auditoria.RegistrarAsync("Oportunidad", id, "CAMBIO_ETAPA", etapaAnterior, etapa, UsuarioActualId);

        return Ok(new { success = true, id, etapa });
    }

    [HttpPut("{id:long}/asignar")]
    [Authorize(Roles = "Administrador,Supervisor")]
    public async Task<IActionResult> Asignar(long id, [FromBody] AsignacionDto dto)
    {
        var oportunidad = await _context.Oportunidades.FindAsync(id);
        if (oportunidad == null) return NotFound("Oportunidad no encontrada.");

        var anterior = oportunidad.nUsuarioAsignado?.ToString() ?? "sin asignar";
        oportunidad.nUsuarioAsignado = dto.UsuarioId;
        oportunidad.dFechaActualizacion = DateTime.Now;
        await _context.SaveChangesAsync();

        await _auditoria.RegistrarAsync("Oportunidad", id, "REASIGNACION", anterior,
            dto.UsuarioId?.ToString() ?? "sin asignar", UsuarioActualId);

        return Ok(new { success = true, id, usuarioId = dto.UsuarioId });
    }

    private static IActionResult CsvFile(string fileName, string[] headers, IEnumerable<string?[]> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine(string.Join(",", headers.Select(EscapeCsv)));
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(",", row.Select(EscapeCsv)));
        }

        return new FileContentResult(Encoding.UTF8.GetBytes(builder.ToString()), "text/csv; charset=utf-8")
        {
            FileDownloadName = fileName
        };
    }

    private static string EscapeCsv(string? value) => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";
}

public sealed class CrearOportunidadDto
{
    [Required] public long ClienteId { get; set; }
    public long? ConversacionId { get; set; }
    public int? UsuarioAsignadoId { get; set; }

    [Required(ErrorMessage = "El título es obligatorio.")]
    [StringLength(200)]
    public string? Titulo { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "El monto no puede ser negativo.")]
    public decimal Monto { get; set; }

    public string? Moneda { get; set; }

    [Range(0, 100)]
    public int? Probabilidad { get; set; }

    public DateTime? FechaCierreEstimada { get; set; }
}

public sealed class CambiarEtapaDto
{
    public string? Etapa { get; set; }
    public string? MotivoPerdida { get; set; }
}
