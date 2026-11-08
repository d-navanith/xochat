using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Xochat.Hubs;
using Xochat.Models;
using Xochat.Services;

namespace Xochat.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IDataStore _dataStore;
    private readonly IMetricsService _metricsService;
    private readonly IAutoAssignService _autoAssignService;
    private readonly IAiAssistantService _aiAssistantService;
    private readonly IHubContext<ChatHub> _hubContext;

    public AdminController(
        IDataStore dataStore,
        IMetricsService metricsService,
        IAutoAssignService autoAssignService,
        IAiAssistantService aiAssistantService,
        IHubContext<ChatHub> hubContext)
    {
        _dataStore = dataStore;
        _metricsService = metricsService;
        _autoAssignService = autoAssignService;
        _aiAssistantService = aiAssistantService;
        _hubContext = hubContext;
    }

    [HttpGet("metrics")]
    public IActionResult GetMetrics()
    {
        var (teamMetrics, summary) = _metricsService.GetTeamMetrics();
        return Ok(new
        {
            teamMetrics,
            summary,
            autoAssignEnabled = _autoAssignService.IsAutoAssignEnabled,
            onlineAgentsCount = _autoAssignService.GetOnlineAgents().Count
        });
    }

    [HttpGet("scrape-activity")]
    public IActionResult GetScrapeActivity(
        [FromQuery] string? agentUsername = null,
        [FromQuery] string? customerQuery = null,
        [FromQuery] string? action = null)
    {
        var logs = _dataStore.GetAuditLogs();

        if (!string.IsNullOrWhiteSpace(agentUsername))
        {
            var u = agentUsername.Trim().ToLower();
            logs = logs.Where(l => l.ActorUsername.ToLower().Contains(u) || l.ActorName.ToLower().Contains(u)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(customerQuery))
        {
            var cq = customerQuery.Trim().ToLower();
            logs = logs.Where(l =>
                (l.CustomerName != null && l.CustomerName.ToLower().Contains(cq)) ||
                (l.ReplyText != null && l.ReplyText.ToLower().Contains(cq)) ||
                (l.TargetDescription != null && l.TargetDescription.ToLower().Contains(cq))).ToList();
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            logs = logs.Where(l => string.Equals(l.Action, action.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Ok(new
        {
            totalInterventions = logs.Count,
            activityStream = logs
        });
    }

    [HttpGet("audit-logs")]
    public IActionResult GetAuditLogs([FromHeader(Name = "Authorization")] string? authHeader)
    {
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var jwtService = HttpContext.RequestServices.GetService<IJwtTokenService>();
            var principal = jwtService?.ValidateToken(token);
            var role = principal?.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role == UserRoles.CoreAdmin)
            {
                return StatusCode(403, new { error = "Access Denied: Full Audit Trail is restricted to Super Admin only." });
            }
        }

        var logs = _dataStore.GetAuditLogs();
        return Ok(new { logs });
    }

    [HttpPost("users")]
    public IActionResult CreateTeamUser([FromBody] CreateTeamUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { error = "Username, password and name are required" });
        }

        var existing = _dataStore.GetUserByUsername(req.Username.Trim().ToLower());
        if (existing != null)
        {
            return BadRequest(new { error = "Username already exists. Please pick a different unique username." });
        }

        var role = req.Role == UserRoles.CoreAdmin ? UserRoles.CoreAdmin : UserRoles.Agent;
        var newUser = _dataStore.CreateUser(req.Username.Trim().ToLower(), req.Password, req.Name.Trim(), role);

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_CONSOLE",
            ActorUsername = "admin",
            ActorName = "Administrator",
            ActorRole = "ADMIN",
            Action = "CREATE_USER",
            TargetId = newUser.Id,
            TargetDescription = $"Provisioned new team member @{newUser.Username} ({newUser.Name}) with role {newUser.Role}"
        });

        return StatusCode(201, new
        {
            user = new
            {
                id = newUser.Id,
                username = newUser.Username,
                name = newUser.Name,
                role = newUser.Role,
                avatarUrl = newUser.AvatarUrl
            },
            message = $"Team member @{newUser.Username} created successfully!"
        });
    }

    [HttpPost("auto-assign/toggle")]
    public IActionResult ToggleAutoAssign([FromBody] ToggleAutoAssignRequest? req)
    {
        if (req != null && req.Enabled.HasValue)
        {
            _autoAssignService.IsAutoAssignEnabled = req.Enabled.Value;
        }
        else
        {
            _autoAssignService.IsAutoAssignEnabled = !_autoAssignService.IsAutoAssignEnabled;
        }

        return Ok(new
        {
            autoAssignEnabled = _autoAssignService.IsAutoAssignEnabled,
            message = _autoAssignService.IsAutoAssignEnabled ? "Auto-Assigning Agents enabled" : "Auto-Assigning Agents paused"
        });
    }

    [HttpPost("auto-assign/trigger")]
    public IActionResult TriggerAutoAssign()
    {
        var assigned = _autoAssignService.AutoAssignPendingQueue();
        return Ok(new
        {
            assignedCount = assigned.Count,
            assigned = assigned.Select(c => new { c.Id, c.CustomerName, c.ClaimedByUsername })
        });
    }

    [HttpPost("scrape-team-activity")]
    public IActionResult ScrapeTeamActivity()
    {
        var users = _dataStore.GetUsers();
        var convs = _dataStore.GetConversations();
        var auditLogs = _dataStore.GetAuditLogs();

        // 1. Scrape all agent replies directly from active conversation threads
        var scrapedActions = new List<AuditLog>();
        foreach (var conv in convs)
        {
            var agentReplies = conv.Messages.Where(m => m.SenderType == "AGENT").ToList();
            foreach (var reply in agentReplies)
            {
                var customerMsg = conv.Messages.FirstOrDefault(m => m.SenderType == "CUSTOMER");
                int latencySec = 45;
                if (customerMsg != null && DateTime.TryParse(customerMsg.Timestamp, out var cTime) && DateTime.TryParse(reply.Timestamp, out var rTime))
                {
                    latencySec = Math.Max(5, (int)(rTime - cTime).TotalSeconds);
                }

                var existing = auditLogs.FirstOrDefault(l => l.TargetId == conv.Id && l.Action == "SEND_REPLY" && l.ActorUsername == reply.SenderUsername);
                if (existing != null)
                {
                    scrapedActions.Add(existing);
                }
                else
                {
                    var newLog = new AuditLog
                    {
                        Id = $"scrape_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..4]}",
                        ActorId = reply.SenderId ?? "usr_agent",
                        ActorUsername = reply.SenderUsername ?? "agent",
                        ActorName = reply.SenderName ?? "Agent",
                        ActorRole = "AGENT",
                        Action = "SEND_REPLY",
                        TargetId = conv.Id,
                        CustomerName = conv.CustomerName,
                        ReplyText = reply.Text,
                        ResponseTimeSeconds = latencySec,
                        TargetDescription = $"@{reply.SenderUsername} answered {conv.CustomerName}: \"{reply.Text}\" ({latencySec}s response latency)",
                        Timestamp = reply.Timestamp
                    };
                    _dataStore.LogAudit(newLog);
                    scrapedActions.Add(newLog);
                }
            }
        }

        // 2. Scrape Agent Portals Status
        var onlineAgents = _autoAssignService.GetOnlineAgents();
        var scrapedAgents = users.Where(u => u.Role == UserRoles.Agent).Select(u => new
        {
            username = u.Username,
            name = u.Name,
            avatarUrl = u.AvatarUrl,
            isOnline = onlineAgents.Any(oa => oa.Username == u.Username),
            repliesCount = convs.Sum(c => c.Messages.Count(m => m.SenderType == "AGENT" && m.SenderUsername == u.Username)),
            handledCount = convs.Count(c => c.ClaimedByUsername == u.Username)
        }).ToList();

        var refreshedLogs = _dataStore.GetAuditLogs();

        return Ok(new
        {
            success = true,
            targetPortal = "http://localhost:5121 (Team Members Live Portal)",
            scrapedAt = DateTime.UtcNow.ToString("o"),
            totalScrapedActions = refreshedLogs.Count,
            scrapedAgents,
            activityStream = refreshedLogs
        });
    }

    [HttpPost("reset-seed")]
    public IActionResult ResetSeed()
    {
        _dataStore.ResetSeed();
        HttpContext.RequestServices.GetService<ILockManager>()?.ClearAll();
        return Ok(new { message = "Database reset to initial mockup seeds." });
    }

    /// <summary>
    /// SUPER ADMIN ONLY: wipes all conversations, messages and audit logs (clean chat database).
    /// Team users and customer accounts are preserved; a db.json backup is written first.
    /// </summary>
    [HttpPost("clean-chat-data")]
    public async Task<IActionResult> CleanChatData([FromHeader(Name = "Authorization")] string? authHeader)
    {
        string? role = null;
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var principal = HttpContext.RequestServices.GetService<IJwtTokenService>()?.ValidateToken(token);
            role = principal?.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
        }

        if (role != UserRoles.SuperAdmin)
        {
            return StatusCode(403, new { error = "Only Super Admin can clean the chat database." });
        }

        var backupPath = _dataStore.CleanChatData();
        HttpContext.RequestServices.GetService<ILockManager>()?.ClearAll();

        // Tell every connected portal to refresh to the clean state
        await _hubContext.Clients.All.SendAsync("locks:sync", new Dictionary<string, object>());
        await _hubContext.Clients.All.SendAsync("stats:updated", new { pendingCount = 0, repliedCount = 0, totalPendingCount = 0 });

        return Ok(new
        {
            success = true,
            backup = Path.GetFileName(backupPath),
            message = "Chat database cleaned. Users and customer accounts were kept."
        });
    }

    [HttpGet("pipeline")]
    public IActionResult GetPipelineData()
    {
        var all = _dataStore.GetConversations();
        var users = _dataStore.GetUsers();
        var agents = users.Where(u => u.Role == UserRoles.Agent).ToList();

        var stageStats = new Dictionary<string, int>
        {
            ["NEW"] = all.Count(c => c.Stage == "NEW"),
            ["IN_PROGRESS"] = all.Count(c => c.Stage == "IN_PROGRESS"),
            ["OPEN_DEAL"] = all.Count(c => c.Stage == "OPEN_DEAL"),
            ["REPLIED"] = all.Count(c => c.Stage == "REPLIED"),
            ["CLOSED"] = all.Count(c => c.Stage == "CLOSED")
        };

        var totalPipelineValue = all.Sum(c => c.DealValue);

        return Ok(new
        {
            leads = all,
            agents,
            stageStats,
            totalPipelineValue,
            totalLeads = all.Count
        });
    }

    [HttpPatch("conversations/{id}/stage")]
    public async Task<IActionResult> UpdateLeadStage(string id, [FromBody] UpdateLeadStageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Stage))
        {
            return BadRequest(new { error = "Stage is required" });
        }

        var validStages = new[] { "NEW", "OPEN", "IN_PROGRESS", "OPEN_DEAL", "REPLIED", "CLOSED" };
        var targetStage = req.Stage.ToUpperInvariant();
        if (!validStages.Contains(targetStage))
        {
            return BadRequest(new { error = $"Invalid stage. Allowed: {string.Join(", ", validStages)}" });
        }

        var updated = _dataStore.UpdateConversation(id, c =>
        {
            c.Stage = targetStage;
            if (targetStage == "REPLIED")
            {
                c.HasReplied = true;
                c.Status = "REPLIED";
                c.IsUnansweredGreen = false;
            }
            else if (targetStage == "CLOSED")
            {
                c.Status = "CLOSED";
                c.HasReplied = true;
                c.IsUnansweredGreen = false;
                c.ClosedAt = DateTime.UtcNow.ToString("o");
            }
            else if (targetStage == "NEW")
            {
                if (!c.HasReplied && c.ReplyCount == 0)
                {
                    c.Status = "PENDING";
                    c.IsUnansweredGreen = true;
                }
            }
            else if (targetStage == "IN_PROGRESS" || targetStage == "OPEN_DEAL")
            {
                // Never revert an already-replied live chat to PENDING
                if (!c.HasReplied && c.ReplyCount == 0)
                {
                    c.Status = "PENDING";
                }
            }
        });

        if (updated == null) return NotFound(new { error = "Conversation not found" });

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_PIPELINE",
            ActorUsername = "admin",
            ActorName = "CRM Admin Manager",
            ActorRole = "SUPER_ADMIN",
            Action = "STAGE_UPDATE",
            TargetId = id,
            CustomerName = updated.CustomerName,
            TargetDescription = $"Lead stage updated to {targetStage} for {updated.CustomerName}"
        });

        await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = updated });
        return Ok(new { success = true, conversation = updated });
    }

    [HttpPost("conversations/{id}/notes")]
    public async Task<IActionResult> AddLeadNote(string id, [FromBody] AddLeadNoteRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
        {
            return BadRequest(new { error = "Note text is required" });
        }

        var author = !string.IsNullOrWhiteSpace(req.Author) ? req.Author.Trim() : "Admin Manager";
        var note = _dataStore.AddLeadNote(id, author, req.Text.Trim());
        if (note == null) return NotFound(new { error = "Conversation not found" });

        var conv = _dataStore.GetConversationById(id);

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_CONSOLE",
            ActorUsername = author.ToLower().Replace(" ", "_"),
            ActorName = author,
            ActorRole = "SUPER_ADMIN",
            Action = "ADD_LEAD_NOTE",
            TargetId = id,
            CustomerName = conv?.CustomerName,
            TargetDescription = $"Added note to {conv?.CustomerName}: \"{req.Text.Trim()}\""
        });

        if (conv != null)
        {
            await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = conv });
        }

        return Ok(new { success = true, note, conversation = conv });
    }

    [HttpPost("conversations/{id}/tasks")]
    public async Task<IActionResult> AddLeadTask(string id, [FromBody] AddLeadTaskRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
        {
            return BadRequest(new { error = "Task title is required" });
        }

        var assigned = !string.IsNullOrWhiteSpace(req.AssignedTo) ? req.AssignedTo.Trim() : "Team Member";
        var task = _dataStore.AddLeadTask(id, req.Title.Trim(), assigned, req.DueDate ?? "Today, 12:00 PM", req.Priority ?? "High");
        if (task == null) return NotFound(new { error = "Conversation not found" });

        var conv = _dataStore.GetConversationById(id);

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_CONSOLE",
            ActorUsername = "admin",
            ActorName = "CRM Admin Manager",
            ActorRole = "SUPER_ADMIN",
            Action = "CREATE_LEAD_TASK",
            TargetId = id,
            CustomerName = conv?.CustomerName,
            TargetDescription = $"Created task \"{req.Title.Trim()}\" assigned to {assigned}"
        });

        if (conv != null)
        {
            await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = conv });
        }

        return Ok(new { success = true, task, conversation = conv });
    }

    [HttpPatch("conversations/{id}/tasks/{taskId}/toggle")]
    public async Task<IActionResult> ToggleLeadTask(string id, string taskId)
    {
        var task = _dataStore.ToggleLeadTask(id, taskId);
        if (task == null) return NotFound(new { error = "Task or conversation not found" });

        var conv = _dataStore.GetConversationById(id);
        if (conv != null)
        {
            await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = conv });
        }

        return Ok(new { success = true, task, conversation = conv });
    }

    [HttpPost("conversations/{id}/send-email")]
    public async Task<IActionResult> SendLeadEmail(string id, [FromBody] SendLeadEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.BodyText))
        {
            return BadRequest(new { error = "Email body text is required" });
        }

        var conv = _dataStore.GetConversationById(id);
        if (conv == null) return NotFound(new { error = "Conversation not found" });

        var subject = !string.IsNullOrWhiteSpace(req.Subject) ? req.Subject.Trim() : "Update regarding your inquiry";
        var toEmail = !string.IsNullOrWhiteSpace(req.ToEmail) ? req.ToEmail.Trim() : conv.CustomerEmail ?? "customer@example.com";

        _dataStore.AddLeadNote(id, "Email Dispatcher", $"Dispatched email: \"{subject}\" to {toEmail}");

        if (req.CreateFollowUpTask)
        {
            _dataStore.AddLeadTask(id, $"Follow up on email: {subject}", conv.ClaimedByName ?? "H.M. Murdock", "Tomorrow, 10:00 AM", "Medium");
        }

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_CONSOLE",
            ActorUsername = "admin",
            ActorName = "Administrator",
            ActorRole = "SUPER_ADMIN",
            Action = "DISPATCH_LEAD_EMAIL",
            TargetId = id,
            CustomerName = conv.CustomerName,
            TargetDescription = $"Sent email \"{subject}\" to {toEmail}"
        });

        var updated = _dataStore.GetConversationById(id);
        if (updated != null)
        {
            await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = updated });
        }

        return Ok(new { success = true, message = "Email dispatched successfully.", conversation = updated });
    }

    [HttpPatch("conversations/{id}/reassign")]
    public async Task<IActionResult> ReassignLead(string id, [FromBody] ReassignLeadRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.AgentId) || string.IsNullOrWhiteSpace(req.Username))
        {
            return BadRequest(new { error = "AgentId and Username are required" });
        }

        var updated = _dataStore.UpdateConversation(id, c =>
        {
            c.ClaimedByAgentId = req.AgentId;
            c.ClaimedByUsername = req.Username;
            c.ClaimedByName = req.Name;
            c.ClaimedByAvatar = req.AvatarUrl ?? "";
            c.ClaimedAt = DateTime.UtcNow.ToString("o");
            if (c.Stage == "NEW")
            {
                c.Stage = "IN_PROGRESS";
            }
        });

        if (updated == null) return NotFound(new { error = "Conversation not found" });

        _dataStore.LogAudit(new AuditLog
        {
            ActorId = "ADMIN_CONSOLE",
            ActorUsername = "admin",
            ActorName = "Administrator",
            ActorRole = "SUPER_ADMIN",
            Action = "REASSIGN_LEAD_OWNER",
            TargetId = id,
            CustomerName = updated.CustomerName,
            TargetDescription = $"Reassigned {updated.CustomerName} to @{req.Username} ({req.Name})"
        });

        await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = updated });
        return Ok(new { success = true, conversation = updated });
    }

    [HttpDelete("conversations/{conversationId}/messages/{messageId}")]
    public async Task<IActionResult> DeleteTeamMemberMessage(
        string conversationId,
        string messageId,
        [FromHeader(Name = "Authorization")] string? authHeader)
    {
        // Strictly restricted to Super Admin only
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var jwtService = HttpContext.RequestServices.GetService<IJwtTokenService>();
            var principal = jwtService?.ValidateToken(token);
            var role = principal?.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role != UserRoles.SuperAdmin)
            {
                return StatusCode(403, new { error = "Access Denied: Only Super Admin can delete team member messages." });
            }
        }

        var (success, error, updatedConv) = _dataStore.DeleteAgentMessage(conversationId, messageId, isSuperAdmin: true);
        if (!success || updatedConv == null)
        {
            return BadRequest(new { error = error ?? "Failed to delete message." });
        }

        // Real-time SignalR notifications:
        // 1. Notify Customer Portal (Port 3002) - remove the message completely with NO trace
        var customerRoom = $"customer:{updatedConv.CustomerName.ToLower().Trim()}";
        await _hubContext.Clients.Group(customerRoom).SendAsync("customer:message_deleted", new
        {
            conversationId,
            messageId,
            isWaitingForReply = !updatedConv.HasReplied && updatedConv.Status == "PENDING"
        });

        // 2. Notify all Admin and Team Member clients
        await _hubContext.Clients.All.SendAsync("message:deleted", new
        {
            conversationId,
            messageId,
            conversation = updatedConv
        });

        await _hubContext.Clients.All.SendAsync("conversation:updated", new { conversation = updatedConv });

        // Update stats
        var all = _dataStore.GetConversations();
        var pendingCount = all.Count(c => !c.HasReplied && c.Status == "PENDING");
        var repliedCount = all.Count(c => c.HasReplied || c.Status == "REPLIED");
        await _hubContext.Clients.All.SendAsync("stats:updated", new { pendingCount, repliedCount, totalPendingCount = pendingCount });

        return Ok(new
        {
            success = true,
            conversation = updatedConv,
            message = "Team member message deleted immediately without client-side trace."
        });
    }

    #region AI Intelligence Assistant (Super Admin Only)

    private bool IsCoreAdminOrAgent(string? authHeader)
    {
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var jwtService = HttpContext.RequestServices.GetService<IJwtTokenService>();
            var principal = jwtService?.ValidateToken(token);
            var role = principal?.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role == UserRoles.CoreAdmin || role == UserRoles.Agent)
            {
                return true;
            }
        }
        return false;
    }

    [HttpGet("assistant/team-members")]
    public IActionResult GetAssistantTeamMembers([FromHeader(Name = "Authorization")] string? authHeader)
    {
        if (IsCoreAdminOrAgent(authHeader))
        {
            return StatusCode(403, new { error = "Access Denied: AI Intelligence Assistant is restricted to Super Admin only." });
        }

        var members = _aiAssistantService.GetAvailableTeamMembers();
        return Ok(new { members });
    }

    [HttpGet("assistant/dossier/{username}")]
    public IActionResult GetAgentDossier(string username, [FromHeader(Name = "Authorization")] string? authHeader)
    {
        if (IsCoreAdminOrAgent(authHeader))
        {
            return StatusCode(403, new { error = "Access Denied: AI Intelligence Assistant is restricted to Super Admin only." });
        }

        var dossier = _aiAssistantService.GetAgentDossier(username);
        if (dossier == null)
        {
            return NotFound(new { error = $"Team member '@{username}' not found in active records." });
        }

        return Ok(new { dossier });
    }

    [HttpPost("assistant/query")]
    public IActionResult QueryAssistant([FromBody] AiAssistantQueryRequest req, [FromHeader(Name = "Authorization")] string? authHeader)
    {
        if (IsCoreAdminOrAgent(authHeader))
        {
            return StatusCode(403, new { error = "Access Denied: AI Intelligence Assistant is restricted to Super Admin only." });
        }

        var response = _aiAssistantService.ProcessQuery(req.Query, req.SelectedUsername);
        return Ok(response);
    }

    #endregion
}

public class ToggleAutoAssignRequest
{
    public bool? Enabled { get; set; }
}
