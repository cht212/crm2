using Microsoft.AspNetCore.Mvc;

namespace CRM.Data.Controllers;

[ApiController]
[Route("api")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            sistema = "CRM HPD",
            estado = "OK",
            version = "1.0",
            mensaje = "API funcionando correctamente"
        });
    }
}
