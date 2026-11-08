using Microsoft.AspNetCore.SignalR;
using Xochat.Models;
using Xochat.Services;

namespace Xochat.Hubs;

public class ChatHub : Hub
{
    private readonly IDataStore _dataStore;
    private readonly ILockManager _lockManager;
    private readonly IServiceProvider _serviceProvider;

    public ChatHub(
        IDataStore dataStore,
        ILockManager lockManager,
        IServiceProvider serviceProvider)
    {
        _dataStore = dataStore;
        _lockManager = lockManager;
        _serviceProvider = serviceProvider;
    }

    public async Task AgentRegister(string agentId, string username, string name, string avatarUrl)
    {
        Context.Items["agentId"] = agentId;
        Context.Items["username"] = username;
        Context.Items["name"] = name;
        Context.Items["avatarUrl"] = avatarUrl;
        
        var user = _dataStore.GetUserById(agentId) ?? _dataStore.GetUserByUsername(username);
        var role = user?.Role ?? "AGENT";
        Context.Items["role"] = role;

        await Groups.AddToGroupAsync(Context.ConnectionId, "agents");

        // ONLY register support agents in auto-assign service! Super Admin and Core Admin oversee the system and do NOT take support queue tickets.
        if (role == UserRoles.Agent)
        {
            var autoAssignService = _serviceProvider.GetService<IAutoAssignService>();
            autoAssignService?.RegisterOnlineAgent(agentId, username, name, avatarUrl, Context.ConnectionId);
        }

        // Send active locks to the newly registered agent
        await Clients.Caller.SendAsync("locks:sync", _lockManager.GetAllActiveLocks());
        await BroadcastStats();
    }

    /// <summary>
    /// Strict customer ownership check: a conversation belongs to a customer ONLY when the
    /// customer ID matches or the full name matches exactly (case-insensitive).
    /// Fuzzy "Contains" matching previously leaked other customers' pending state.
    /// </summary>
    private static bool BelongsToCustomer(Conversation c, string? customerId, string customerName)
    {
        if (!string.IsNullOrEmpty(customerId) && string.Equals(c.CustomerId, customerId, StringComparison.OrdinalIgnoreCase))
            return true;
        return string.Equals(c.CustomerName.Trim(), customerName.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    public async Task CustomerRegister(string customerName, string? customerId)
    {
        var cleanName = customerName.ToLower().Trim();
        var room = $"customer:{cleanName}";
        await Groups.AddToGroupAsync(Context.ConnectionId, room);

        var allCust = _dataStore.GetConversations()
            .Where(c => BelongsToCustomer(c, customerId, customerName))
            .ToList();

        var pendingConv = allCust.FirstOrDefault(c => !c.HasReplied && c.Status == "PENDING");
        var isWaitingForReply = pendingConv != null;

        // Full chronological history for this customer only
        var history = allCust
            .SelectMany(c => c.Messages)
            .OrderBy(m => DateTime.TryParse(m.Timestamp, out var t) ? t : DateTime.MinValue)
            .ToList();

        await Clients.Caller.SendAsync("customer:sync_status", new
        {
            isWaitingForReply,
            conversation = pendingConv ?? allCust.FirstOrDefault(),
            messages = history
        });
    }

    public async Task ClaimLock(string conversationId)
    {
        var agentId = Context.Items["agentId"]?.ToString();
        var username = Context.Items["username"]?.ToString();
        var name = Context.Items["name"]?.ToString();
        var avatarUrl = Context.Items["avatarUrl"]?.ToString() ?? "";

        if (string.IsNullOrEmpty(agentId) || string.IsNullOrEmpty(username))
        {
            await Clients.Caller.SendAsync("claim:failed", new { message = "You must be logged in to claim conversations." });
            return;
        }

        var conv = _dataStore.GetConversationById(conversationId);
        if (conv == null)
        {
            await Clients.Caller.SendAsync("claim:failed", new { message = "Conversation not found." });
            return;
        }

        if (conv.HasReplied || conv.ReplyCount >= 1)
        {
            await Clients.Caller.SendAsync("claim:failed", new
            {
                conversationId,
                message = "This inquiry has already been answered and moved to the Replied Box."
            });
            return;
        }

        var result = _lockManager.AcquireLock(conversationId, agentId, username, name ?? username, avatarUrl);
        if (result.Success && result.Lock != null)
        {
            await Clients.Caller.SendAsync("claim:success", new
            {
                conversationId,
                lockState = result.Lock
            });

            await Clients.Others.SendAsync("conversation:locked", new
            {
                conversationId,
                lockState = result.Lock
            });

            _dataStore.LogAudit(new AuditLog
            {
                ActorId = agentId,
                ActorUsername = username,
                ActorName = name ?? username,
                ActorRole = "AGENT",
                Action = "CLAIM_CONVERSATION",
                TargetId = conversationId,
                CustomerName = conv.CustomerName,
                TargetDescription = $"@{username} claimed customer {conv.CustomerName}"
            });
        }
        else
        {
            await Clients.Caller.SendAsync("claim:failed", new
            {
                conversationId,
                message = result.Message,
                lockState = result.Lock
            });
        }
    }

    public async Task ClaimRelease(string conversationId)
    {
        var agentId = Context.Items["agentId"]?.ToString();
        if (string.IsNullOrEmpty(agentId)) return;

        var released = _lockManager.ReleaseLock(conversationId, agentId);
        if (released)
        {
            await Clients.All.SendAsync("conversation:unlocked", new { conversationId });
        }
    }

    public async Task SendMessage(string conversationId, string text)
    {
        var agentId = Context.Items["agentId"]?.ToString();
        var username = Context.Items["username"]?.ToString();
        var name = Context.Items["name"]?.ToString();
        var avatarUrl = Context.Items["avatarUrl"]?.ToString() ?? "";

        if (string.IsNullOrEmpty(agentId) || string.IsNullOrEmpty(username))
        {
            await Clients.Caller.SendAsync("message:error", new { error = "Agent authentication required" });
            return;
        }

        var conv = _dataStore.GetConversationById(conversationId);
        if (conv == null) return;

        // USER RULE: "team members can reply only one reply can send"
        if (conv.HasReplied || conv.ReplyCount >= 1)
        {
            await Clients.Caller.SendAsync("message:error", new
            {
                error = "Strict Rule: Team members can send only 1 reply per customer inquiry. Further replies are blocked by the system."
            });
            return;
        }

        var now = DateTime.Now;
        var timeFormatted = FormatChatTime(now);
        var dateFormatted = FormatChatDate(now);

        var replyMsg = new Message
        {
            Id = $"msg_reply_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            ConversationId = conv.Id,
            SenderType = "AGENT",
            SenderId = agentId,
            SenderUsername = username,
            SenderName = name ?? username,
            SenderAvatar = avatarUrl,
            Text = text.Trim(),
            Timestamp = now.ToString("o"),
            TimeFormatted = timeFormatted,
            DateFormatted = dateFormatted
        };

        _dataStore.AddMessage(conv.Id, replyMsg);

        // Calculate response latency in seconds
        var responseTimeSeconds = 45;
        if (DateTime.TryParse(conv.CreatedAt, out var createdDt))
        {
            responseTimeSeconds = Math.Max(5, (int)(now - createdDt).TotalSeconds);
        }

        // USER RULE:
        // 1. remove green color mark (IsUnansweredGreen = false)
        // 2. chat is closed and goes to replied box (status = "REPLIED", HasReplied = true, ReplyCount = 1)
        var updatedConv = _dataStore.UpdateConversation(conv.Id, c =>
        {
            c.Status = "REPLIED";
            c.HasReplied = true;
            c.ReplyCount = 1;
            c.IsUnansweredGreen = false; // GREEN COLOR MARK REMOVED!
            c.ClaimedByAgentId = agentId;
            c.ClaimedByUsername = username;
            c.ClaimedByName = name ?? username;
            c.ClaimedByAvatar = avatarUrl;
            c.ClaimedAt = now.ToString("o");
            c.ClosedAt = now.ToString("o");
            c.LastMessageText = text.Trim();
            c.LastMessageTime = timeFormatted;
        });

        // Release active drafting lock
        _lockManager.ReleaseLock(conv.Id, agentId, force: true);

        // Log detailed audit for Admins (Admin Scraping & Activity tracking)
        _dataStore.LogAudit(new AuditLog
        {
            ActorId = agentId,
            ActorUsername = username,
            ActorName = name ?? username,
            ActorRole = "AGENT",
            Action = "SEND_REPLY",
            TargetId = conv.Id,
            CustomerName = conv.CustomerName,
            ReplyText = text.Trim(),
            ResponseTimeSeconds = responseTimeSeconds,
            TargetDescription = $"@{username} answered {conv.CustomerName}: \"{text.Trim()}\" ({responseTimeSeconds}s response time)"
        });

        // Broadcast events
        await Clients.All.SendAsync("conversation:replied_and_closed", new
        {
            conversationId = conv.Id,
            conversation = updatedConv
        });

        await Clients.All.SendAsync("conversation:updated", new { conversation = updatedConv });
        await Clients.All.SendAsync("conversation:unlocked", new { conversationId = conv.Id });
        await BroadcastStats();

        // Deliver real-time message to customer portal room (localhost:3002)
        var customerRoom = $"customer:{conv.CustomerName.ToLower().Trim()}";
        await Clients.Group(customerRoom).SendAsync("customer:reply_received", new
        {
            conversationId = conv.Id,
            reply = replyMsg,
            conversation = updatedConv,
            isWaitingForReply = false // Team member replied! Customer can now interact again
        });

        await Clients.Caller.SendAsync("message:sent_success", new { conversationId = conv.Id });
    }

    public async Task CustomerSendMessage(string customerName, string text, string? email = null)
    {
        if (string.IsNullOrWhiteSpace(customerName) || string.IsNullOrWhiteSpace(text)) return;

        var customer = _dataStore.GetOrCreateCustomer(customerName, email);

        // USER RULE: "customer can't message repeatedly, once he send an one message he should wait until team members will reply . thats the meaning of this ."
        var allCust = _dataStore.GetConversations()
            .Where(c => BelongsToCustomer(c, customer.Id, customer.Name))
            .ToList();

        var existingPending = allCust.FirstOrDefault(c => !c.HasReplied && c.Status == "PENDING");
        if (existingPending != null)
        {
            await Clients.Caller.SendAsync("customer:message_blocked", new
            {
                conversationId = existingPending.Id,
                message = "Wait for a minute our team will contact you soon...",
                isWaitingForReply = true
            });
            return;
        }

        var convId = $"conv_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..4]}";
        var now = DateTime.Now;
        var timeFormatted = FormatChatTime(now);
        var dateFormatted = FormatChatDate(now);
        var dateStr = FormatChatDateStr(now);

        var message = new Message
        {
            Id = $"msg_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            ConversationId = convId,
            SenderType = "CUSTOMER",
            SenderName = customer.Name,
            SenderAvatar = customer.AvatarUrl,
            Text = text.Trim(),
            Timestamp = now.ToString("o"),
            TimeFormatted = timeFormatted,
            DateFormatted = dateFormatted
        };

        var newConv = new Conversation
        {
            Id = convId,
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            CustomerAvatar = customer.AvatarUrl,
            Status = "PENDING",
            HasReplied = false,
            ReplyCount = 0,
            IsUnansweredGreen = true, // GREEN COLOR MARK ACTIVE!
            LastMessageText = text.Trim(),
            LastMessageTime = timeFormatted,
            DateStr = dateStr,
            DateFormatted = dateFormatted,
            Messages = new List<Message> { message },
            CreatedAt = now.ToString("o"),
            UpdatedAt = now.ToString("o")
        };

        _dataStore.CreateConversation(newConv);

        // Broadcast to all team members
        await Clients.All.SendAsync("conversation:new_pending", new { conversation = newConv });
        await BroadcastStats();

        // Notify customer socket: now locked waiting for reply!
        await Clients.Caller.SendAsync("customer:message_sent", new
        {
            conversation = newConv,
            message,
            isWaitingForReply = true
        });

        // Trigger Auto-Assigning Agents engine (inspired by Dribbble concept)
        var autoAssignService = _serviceProvider.GetService<IAutoAssignService>();
        autoAssignService?.AutoAssignInquiry(convId);
    }

    public async Task TriggerAutoAssignment()
    {
        var autoAssignService = _serviceProvider.GetService<IAutoAssignService>();
        if (autoAssignService != null)
        {
            var assigned = autoAssignService.AutoAssignPendingQueue();
            await BroadcastStats();
            await Clients.Caller.SendAsync("autoassign:completed", new { count = assigned.Count });
        }
    }

    public async Task BroadcastStats()
    {
        var convs = _dataStore.GetConversations();
        var pendingCount = convs.Count(c => !c.HasReplied && c.Status == "PENDING");
        var repliedCount = convs.Count(c => c.HasReplied || c.Status == "REPLIED");

        // totalPendingCount = unanswered inquiries across ALL dates (header badge).
        // Clients refetch their own date-filtered counts on this event.
        await Clients.All.SendAsync("stats:updated", new
        {
            pendingCount,
            repliedCount,
            totalPendingCount = pendingCount
        });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var agentId = Context.Items["agentId"]?.ToString();
        if (!string.IsNullOrEmpty(agentId))
        {
            var released = _lockManager.ReleaseAllByAgent(agentId);
            foreach (var convId in released)
            {
                await Clients.All.SendAsync("conversation:unlocked", new { conversationId = convId });
            }

            var autoAssignService = _serviceProvider.GetService<IAutoAssignService>();
            autoAssignService?.UnregisterAgent(Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public static string FormatChatTime(DateTime dt)
    {
        var local = dt.Kind == DateTimeKind.Utc ? dt.ToLocalTime() : dt;
        var hours = local.Hour;
        var minutes = local.Minute.ToString("D2");
        var ampm = hours >= 12 ? "P.M." : "A.M.";
        var displayHour = hours % 12 == 0 ? 12 : hours % 12;
        return $"{displayHour}.{minutes} {ampm}";
    }

    public static string FormatChatDate(DateTime dt)
    {
        var local = dt.Kind == DateTimeKind.Utc ? dt.ToLocalTime() : dt;
        var day = local.Day;
        string suffix = (day % 10 == 1 && day != 11) ? "st"
                      : (day % 10 == 2 && day != 12) ? "nd"
                      : (day % 10 == 3 && day != 13) ? "rd"
                      : "th";
        var dayStr = day < 10 ? $"0{day}" : $"{day}";
        var month = local.ToString("MMM", System.Globalization.CultureInfo.InvariantCulture).ToUpperInvariant();
        return $"{dayStr}{suffix} {month} {local.Year}";
    }

    public static string FormatChatDateStr(DateTime dt)
    {
        var local = dt.Kind == DateTimeKind.Utc ? dt.ToLocalTime() : dt;
        return local.ToString("MM.dd.yyyy");
    }
}
