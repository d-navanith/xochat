using Microsoft.AspNetCore.Mvc;

namespace Xochat.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "ok",
            platform = ".NET 10 ASP.NET Core",
            service = "Xochat Enterprise Live Chat & Auto-Assigning HelpDesk",
            timestamp = DateTime.UtcNow.ToString("o")
        });
    }
}
