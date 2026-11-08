using Microsoft.AspNetCore.Mvc;
using Xochat.Models;
using Xochat.Services;

namespace Xochat.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IDataStore _dataStore;
    private readonly IJwtTokenService _jwtService;

    public AuthController(IDataStore dataStore, IJwtTokenService jwtService)
    {
        _dataStore = dataStore;
        _jwtService = jwtService;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username))
        {
            return BadRequest(new { error = "Username is required" });
        }

        var username = req.Username.Trim().ToLower();
        var providedSecretOrPassword = req.SecretCode ?? req.Password ?? "";

        var user = _dataStore.GetUserByUsername(username);
        if (user == null)
        {
            return Unauthorized(new { error = "Invalid credentials. User does not exist." });
        }

        // Secret code checks for Super Admin & Core Admin
        bool isSuperAdminSecret = string.Equals(providedSecretOrPassword, "SUPER_ADMIN_SECRET_2026", StringComparison.OrdinalIgnoreCase);
        bool isCoreAdminSecret = string.Equals(providedSecretOrPassword, "ADMIN_SECRET_2026", StringComparison.OrdinalIgnoreCase);

        bool VerifyPassword(string input, string? hash, string defaultFallback)
        {
            if (string.IsNullOrEmpty(hash)) return input == defaultFallback;
            try
            {
                return BCrypt.Net.BCrypt.Verify(input, hash);
            }
            catch
            {
                return input == defaultFallback;
            }
        }

        bool isValid = false;
        if (user.Role == UserRoles.SuperAdmin && (isSuperAdminSecret || VerifyPassword(providedSecretOrPassword, user.PasswordHash, "admin123")))
        {
            isValid = true;
        }
        else if (user.Role == UserRoles.CoreAdmin && (isCoreAdminSecret || VerifyPassword(providedSecretOrPassword, user.PasswordHash, "admin123")))
        {
            isValid = true;
        }
        else if (VerifyPassword(providedSecretOrPassword, user.PasswordHash, $"{user.Username}123"))
        {
            isValid = true;
        }

        if (!isValid)
        {
            return Unauthorized(new { error = "Invalid password or secret code." });
        }

        var token = _jwtService.GenerateUserToken(user);
        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id,
                username = user.Username,
                name = user.Name,
                role = user.Role,
                avatarUrl = user.AvatarUrl
            }
        });
    }

    [HttpGet("me")]
    public IActionResult GetMe()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { error = "No token provided" });
        }

        var token = authHeader["Bearer ".Length..].Trim();
        var principal = _jwtService.ValidateToken(token);
        if (principal == null)
        {
            return Unauthorized(new { error = "Invalid or expired token" });
        }

        var userId = principal.FindFirst("id")?.Value;
        var user = userId != null ? _dataStore.GetUserById(userId) : null;
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Ok(new
        {
            user = new
            {
                id = user.Id,
                username = user.Username,
                name = user.Name,
                role = user.Role,
                avatarUrl = user.AvatarUrl
            }
        });
    }

    [HttpPost("customer/login")]
    public IActionResult CustomerLogin([FromBody] CustomerLoginRequest req)
    {
        var fullName = req.FullName ?? req.Name;
        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { error = "Full name and password are required" });
        }

        var customer = _dataStore.GetCustomerByName(fullName.Trim());
        if (customer == null)
        {
            return Unauthorized(new { error = "Customer account not found. Please sign up." });
        }

        if (!string.IsNullOrEmpty(customer.PasswordHash) && !BCrypt.Net.BCrypt.Verify(req.Password, customer.PasswordHash))
        {
            return Unauthorized(new { error = "Invalid password" });
        }

        var token = _jwtService.GenerateCustomerToken(customer);
        return Ok(new
        {
            token,
            customer = new
            {
                id = customer.Id,
                name = customer.Name,
                avatarUrl = customer.AvatarUrl
            }
        });
    }

    [HttpPost("customer/signup")]
    public IActionResult CustomerSignup([FromBody] CustomerSignupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { error = "Full name and password are required" });
        }

        var existing = _dataStore.GetCustomerByName(req.FullName.Trim());
        if (existing != null)
        {
            return BadRequest(new { error = "An account with this name already exists. Please login." });
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        var customer = _dataStore.CreateCustomerWithPassword(req.FullName.Trim(), hash, req.Email);

        var token = _jwtService.GenerateCustomerToken(customer);
        return StatusCode(201, new
        {
            token,
            customer = new
            {
                id = customer.Id,
                name = customer.Name,
                avatarUrl = customer.AvatarUrl
            }
        });
    }

    [HttpGet("customer/me")]
    public IActionResult GetCustomerMe()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { error = "No token provided" });
        }

        var token = authHeader["Bearer ".Length..].Trim();
        var principal = _jwtService.ValidateToken(token);
        if (principal == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var custId = principal.FindFirst("id")?.Value;
        var customer = custId != null ? _dataStore.GetCustomerById(custId) : null;
        if (customer == null)
        {
            return NotFound(new { error = "Customer not found" });
        }

        return Ok(new
        {
            customer = new
            {
                id = customer.Id,
                name = customer.Name,
                avatarUrl = customer.AvatarUrl
            }
        });
    }
}
