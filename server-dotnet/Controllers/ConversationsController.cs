using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Xochat.Hubs;
using Xochat.Models;
using Xochat.Services;

namespace Xochat.Controllers;

[ApiController]
[Route("api/conversations")]
public class ConversationsController : ControllerBase
{
    private readonly IDataStore _dataStore;
    private readonly ILockManager _lockManager;
    private readonly IAutoAssignService _autoAssignService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IJwtTokenService _jwtTokenService;

    public ConversationsController(
        IDataStore dataStore,
        ILockManager lockManager,
        IAutoAssignService autoAssignService,
        IHubContext<ChatHub> hubContext,
        IJwtTokenService jwtTokenService)
    {
        _dataStore = dataStore;
        _lockManager = lockManager;
        _autoAssignService = autoAssignService;
        _hubContext = hubContext;
        _jwtTokenService = jwtTokenService;
    }

    [HttpGet]
    public IActionResult GetConversations([FromQuery] string tab = "all", [FromQuery] string? date = null, [FromQuery] string? agentId = null)
    {
        var all = _dataStore.GetConversations();

        bool isDateFiltered = !string.IsNullOrEmpty(date) && !string.Equals(date, "all", StringComparison.OrdinalIgnoreCase);

        bool MatchesDateForInbox(Conversation c)
        {
            if (!isDateFiltered) return true;
            if (DateMatchesFilter(c.DateStr, c.CreatedAt, c.DateFormatted, date)) return true;
            return c.Messages.Any(m => m.SenderType == "CUSTOMER" && DateMatchesFilter(null, m.Timestamp, m.DateFormatted, date));
        }

        bool MatchesDateForReplied(Conversation c)
        {
            if (!isDateFiltered) return true;
            // 1. Check if any agent reply in this conversation was sent on this date (Proof of reply timestamp)
            if (c.Messages.Any(m => m.SenderType == "AGENT" && DateMatchesFilter(null, m.Timestamp, m.DateFormatted, date)))
                return true;
            // 2. Check if conversation closed/claimed on this date
            if (!string.IsNullOrEmpty(c.ClosedAt) && DateMatchesFilter(null, c.ClosedAt, null, date)) return true;
            if (!string.IsNullOrEmpty(c.ClaimedAt) && DateMatchesFilter(null, c.ClaimedAt, null, date)) return true;
            // 3. Check if conversation created on this date
            if (DateMatchesFilter(c.DateStr, c.CreatedAt, c.DateFormatted, date)) return true;
            return false;
        }

        // 1. Pending count: unanswered customer inquiries for selected date (or all dates)
        var pendingCount = all.Count(c => !c.HasReplied && c.Status == "PENDING" && MatchesDateForInbox(c));

        // 1b. Pending inquiries across ALL dates + the dates they live on, so agents can
        //     always locate a waiting customer even when another date is selected.
        var allPending = all.Where(c => !c.HasReplied && c.Status == "PENDING").ToList();
        var totalPendingCount = allPending.Count;
        var pendingDates = allPending
            .GroupBy(c => c.DateStr)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderByDescending(x => x.date)
            .ToList();
        
        // 2. Total replied count across the company for selected date (or all dates)
        var totalRepliedCount = all.Count(c => (c.HasReplied || c.Status == "REPLIED") && MatchesDateForReplied(c));

        // 3. Resolve caller identity and role for strict isolation & security
        string? callerRole = null;
        string? callerUsername = null;
        string? callerId = null;

        var authHeader = Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            var principal = _jwtTokenService.ValidateToken(token);
            if (principal != null)
            {
                callerRole = principal.Claims.FirstOrDefault(c => c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;
                callerUsername = principal.Claims.FirstOrDefault(c => c.Type == "username")?.Value;
                callerId = principal.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
            }
        }

        User? agentUser = null;
        if (!string.IsNullOrEmpty(agentId))
        {
            agentUser = _dataStore.GetUserById(agentId) ?? _dataStore.GetUserByUsername(agentId);
            if (agentUser != null)
            {
                callerRole ??= agentUser.Role;
                callerUsername ??= agentUser.Username;
                callerId ??= agentUser.Id;
            }
        }

        bool isAdmin = string.Equals(callerRole, UserRoles.SuperAdmin, StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(callerRole, UserRoles.CoreAdmin, StringComparison.OrdinalIgnoreCase);

        string? targetUsername = callerUsername ?? agentUser?.Username;
        string? targetId = callerId ?? agentUser?.Id;
        if (string.IsNullOrEmpty(targetUsername) && !string.IsNullOrEmpty(agentId))
        {
            targetUsername = agentId;
            targetId = agentId;
        }

        // Helper to check if a conversation was replied to by THIS specific agent.
        // STRICT RULE: Unreplied inquiries (pending) can NEVER match.
        bool IsRepliedByThisAgent(Conversation c)
        {
            if (!c.HasReplied && c.Status != "REPLIED") return false;
            if (string.IsNullOrEmpty(targetUsername) && string.IsNullOrEmpty(targetId)) return false;

            // Check if any AGENT message in this conversation was authored by this agent
            bool hasAgentMessage = c.Messages.Any(m => m.SenderType == "AGENT" && (
                (!string.IsNullOrEmpty(targetUsername) && string.Equals(m.SenderUsername, targetUsername, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(targetId) && string.Equals(m.SenderId, targetId, StringComparison.OrdinalIgnoreCase))
            ));
            if (hasAgentMessage) return true;

            // Check claimed fields only if conversation is actually marked replied
            if (!string.IsNullOrEmpty(targetUsername) && string.Equals(c.ClaimedByUsername, targetUsername, StringComparison.OrdinalIgnoreCase))
                return true;
            if (!string.IsNullOrEmpty(targetId) && string.Equals(c.ClaimedByAgentId, targetId, StringComparison.OrdinalIgnoreCase))
                return true;

            return false;
        }

        // 4. Inquiries replied by THIS agent for selected date
        var myRepliedCount = (string.IsNullOrEmpty(targetUsername) && string.IsNullOrEmpty(targetId))
            ? 0
            : all.Count(c => MatchesDateForReplied(c) && IsRepliedByThisAgent(c));

        // Mine badge count: strictly equals myRepliedCount (unreplied messages NEVER count towards Mine!)
        var mineCount = myRepliedCount;

        // Replied count: Admins see total company replies; Team members strictly see their own count
        var repliedCount = isAdmin ? totalRepliedCount : myRepliedCount;

        // Pre-compute segmented collections so frontend can switch tabs in 0ms without re-fetching over network
        var allPendingForDate = all.Where(c => !c.HasReplied && c.Status == "PENDING" && MatchesDateForInbox(c)).ToList();
        var allMineForDate = all.Where(c => MatchesDateForReplied(c) && IsRepliedByThisAgent(c)).ToList();
        var allRepliedForDate = isAdmin
            ? all.Where(c => (c.HasReplied || c.Status == "REPLIED") && MatchesDateForReplied(c)).ToList()
            : allMineForDate;

        List<Conversation> filtered;

        if (string.Equals(tab, "replied", StringComparison.OrdinalIgnoreCase))
        {
            filtered = allRepliedForDate;
        }
        else if (string.Equals(tab, "replied_mine", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(tab, "mine", StringComparison.OrdinalIgnoreCase))
        {
            filtered = allMineForDate;
        }
        else
        {
            filtered = allPendingForDate;
        }

        var activeLocks = _lockManager.GetAllActiveLocks();

        return Ok(new
        {
            conversations = filtered,
            inboxAll = allPendingForDate,
            inboxMine = allMineForDate,
            repliedAll = allRepliedForDate,
            activeLocks,
            stats = new
            {
                pendingCount,
                repliedCount,
                mineCount,
                myRepliedCount,
                totalRepliedCount,
                totalPendingCount,
                pendingDates
            }
        });
    }

    [HttpGet("{id}")]
    public IActionResult GetConversationById(string id)
    {
        var conv = _dataStore.GetConversationById(id);
        if (conv == null) return NotFound(new { error = "Conversation not found" });

        var lockState = _lockManager.GetLock(id);
        return Ok(new { conversation = conv, lockState });
    }

    [HttpGet("customer/{name}")]
    public IActionResult GetCustomerConversations(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Ok(new { conversations = new List<Conversation>(), activeConversation = (Conversation?)null, isWaitingForReply = false });
        }

        var cleanName = name.Trim();
        // Strict ownership: exact customer ID or exact full name only (no fuzzy "Contains")
        var customer = _dataStore.GetCustomerByName(cleanName);
        var allCust = _dataStore.GetConversations().Where(c =>
            (customer != null && string.Equals(c.CustomerId, customer.Id, StringComparison.OrdinalIgnoreCase)) ||
            string.Equals(c.CustomerName.Trim(), customer?.Name.Trim() ?? cleanName, StringComparison.OrdinalIgnoreCase))
            .OrderBy(c => DateTime.TryParse(c.CreatedAt, out var t) ? t : DateTime.MinValue)
            .ToList();

        var pendingConv = allCust.FirstOrDefault(c => !c.HasReplied && c.Status == "PENDING");
        var activeConversation = pendingConv ?? allCust.FirstOrDefault();
        var isWaitingForReply = pendingConv != null;

        return Ok(new
        {
            conversations = allCust,
            activeConversation,
            isWaitingForReply
        });
    }

    [HttpPost("simulate")]
    public async Task<IActionResult> SimulateInquiry([FromBody] SimulateInquiryRequest req)
    {
        var sampleNames = new[] { "Eleanor Vance", "Jordan Belfort", "Sophia Loren", "Liam Neeson", "Zoe Saldana", "Lucas Scott" };
        var sampleQueries = new[]
        {
            "Hello, can you help verify why my order #9942 is held up?",
            "Good morning, I have a doubt regarding your refund policy.",
            "Is there an agent available to discuss enterprise volume rates?",
            "Hi! I tried making a payment but got an authorization error.",
            "Can someone please update the destination address for my cargo?"
        };

        var rng = new Random();
        var name = !string.IsNullOrWhiteSpace(req.CustomerName) ? req.CustomerName.Trim() : sampleNames[rng.Next(sampleNames.Length)];
        var query = !string.IsNullOrWhiteSpace(req.Text) ? req.Text.Trim() : sampleQueries[rng.Next(sampleQueries.Length)];

        var custId = $"cust_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var convId = $"conv_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var avatarUrl = $"https://api.dicebear.com/7.x/personas/svg?seed={Uri.EscapeDataString(name)}";

        var now = DateTime.UtcNow;
        var hours = now.Hour;
        var minutes = now.Minute.ToString("D2");
        var ampm = hours >= 12 ? "P.M." : "A.M.";
        var timeFormatted = $"{(hours % 12 == 0 ? 12 : hours % 12)}.{minutes} {ampm}";

        var message = new Message
        {
            Id = $"msg_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            ConversationId = convId,
            SenderType = "CUSTOMER",
            SenderName = name,
            SenderAvatar = avatarUrl,
            Text = query,
            Timestamp = now.ToString("o"),
            TimeFormatted = timeFormatted,
            DateFormatted = "28th OCT 2026"
        };

        var newConv = new Conversation
        {
            Id = convId,
            CustomerId = custId,
            CustomerName = name,
            CustomerAvatar = avatarUrl,
            Status = "PENDING",
            HasReplied = false,
            ReplyCount = 0,
            IsUnansweredGreen = true, // GREEN COLOR MARK ACTIVE!
            LastMessageText = query,
            LastMessageTime = timeFormatted,
            DateStr = "10.28.2026",
            DateFormatted = "28th OCT 2026",
            Messages = new List<Message> { message },
            CreatedAt = now.ToString("o"),
            UpdatedAt = now.ToString("o")
        };

        _dataStore.CreateConversation(newConv);

        // Broadcast to all team members
        await _hubContext.Clients.All.SendAsync("conversation:new_pending", new { conversation = newConv });

        // Auto-assign
        _autoAssignService.AutoAssignInquiry(convId);

        return StatusCode(201, new
        {
            conversation = newConv,
            message = "Simulated customer inquiry created"
        });
    }

    private static bool DateMatchesFilter(string? dateStr, string? timestamp, string? dateFormatted, string? filter)
    {
        if (string.IsNullOrEmpty(filter) || string.Equals(filter, "all", StringComparison.OrdinalIgnoreCase))
            return true;

        var cleanFilter = filter.Trim();

        // 1. Direct string match
        if (!string.IsNullOrEmpty(dateStr) && string.Equals(dateStr.Trim(), cleanFilter, StringComparison.OrdinalIgnoreCase))
            return true;
        if (!string.IsNullOrEmpty(dateFormatted) && string.Equals(dateFormatted.Trim(), cleanFilter, StringComparison.OrdinalIgnoreCase))
            return true;

        // 2. Parse candidate filter day, month, year
        var filterParts = cleanFilter.Split(new[] { '.', '-', '/' }, StringSplitOptions.RemoveEmptyEntries);
        var filterCandidates = new List<(int Year, int Month, int Day)>();

        if (filterParts.Length == 3 &&
            int.TryParse(filterParts[0], out var p0) &&
            int.TryParse(filterParts[1], out var p1) &&
            int.TryParse(filterParts[2], out var p2))
        {
            int year = p2 >= 1000 ? p2 : (p0 >= 1000 ? p0 : 2026);
            if (p2 >= 1000)
            {
                // Format 1: MM.DD.YYYY (e.g. 10.28.2026 or 11.01.2026)
                if (p0 >= 1 && p0 <= 12 && p1 >= 1 && p1 <= 31)
                    filterCandidates.Add((year, p0, p1));
                // Format 2: DD.MM.YYYY (e.g. 28.10.2026 or 01.11.2026)
                if (p1 >= 1 && p1 <= 12 && p0 >= 1 && p0 <= 31)
                    filterCandidates.Add((year, p1, p0));
            }
            else if (p0 >= 1000)
            {
                // YYYY-MM-DD
                if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31)
                    filterCandidates.Add((p0, p1, p2));
            }
        }

        bool CheckDate(int y, int m, int d)
        {
            foreach (var c in filterCandidates)
            {
                if (y == c.Year && m == c.Month && d == c.Day)
                    return true;
            }
            return false;
        }

        bool CheckDateTime(DateTime dt)
        {
            var local = dt.Kind == DateTimeKind.Utc ? dt.ToLocalTime() : dt;
            if (CheckDate(local.Year, local.Month, local.Day)) return true;

            if (string.Equals(local.ToString("MM.dd.yyyy"), cleanFilter, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(local.ToString("dd.MM.yyyy"), cleanFilter, StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(local.ToString("yyyy-MM-dd"), cleanFilter, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }

        if (!string.IsNullOrEmpty(timestamp) && DateTime.TryParse(timestamp, out var dt))
        {
            if (CheckDateTime(dt)) return true;
        }

        if (!string.IsNullOrEmpty(dateStr) && dateStr.Contains('.'))
        {
            var dParts = dateStr.Split('.');
            if (dParts.Length == 3 && int.TryParse(dParts[0], out var d0) && int.TryParse(dParts[1], out var d1) && int.TryParse(dParts[2], out var d2))
            {
                int dYear = d2 >= 1000 ? d2 : 2026;
                if (d0 >= 1 && d0 <= 12 && d1 >= 1 && d1 <= 31 && CheckDate(dYear, d0, d1)) return true;
                if (d1 >= 1 && d1 <= 12 && d0 >= 1 && d0 <= 31 && CheckDate(dYear, d1, d0)) return true;
            }
        }

        if (!string.IsNullOrEmpty(dateFormatted))
        {
            foreach (var c in filterCandidates)
            {
                try
                {
                    var testDt = new DateTime(c.Year, c.Month, c.Day);
                    var mName = testDt.ToString("MMM", System.Globalization.CultureInfo.InvariantCulture);
                    if (dateFormatted.Contains(mName, StringComparison.OrdinalIgnoreCase))
                    {
                        var day2 = c.Day.ToString("D2");
                        var day1 = c.Day.ToString();
                        if (dateFormatted.Contains(day2) || dateFormatted.Contains(day1))
                            return true;
                    }
                }
                catch { }
            }
        }

        return false;
    }
}
