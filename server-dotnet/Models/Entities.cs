using System.Text.Json.Serialization;

namespace Xochat.Models;

public static class UserRoles
{
    public const string SuperAdmin = "SUPER_ADMIN";
    public const string CoreAdmin = "CORE_ADMIN";
    public const string Agent = "AGENT";
}

public class User
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = UserRoles.Agent;
    public string AvatarUrl { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class Customer
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }

    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;
    public string Channel { get; set; } = "customer_portal_3002";
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class Message
{
    public string Id { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string SenderType { get; set; } = "CUSTOMER"; // CUSTOMER | AGENT | SYSTEM
    public string? SenderId { get; set; }
    public string? SenderUsername { get; set; }
    public string? SenderName { get; set; }
    public string? SenderAvatar { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    public string TimeFormatted { get; set; } = "10.28 A.M.";
    public string DateFormatted { get; set; } = "28th OCT 2026";
}

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerAvatar { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING | REPLIED | CLOSED

    // User business rules:
    public bool HasReplied { get; set; } = false;
    public int ReplyCount { get; set; } = 0; // Only 1 reply permitted per customer inquiry!
    public bool IsUnansweredGreen { get; set; } = true; // Green dot active when unanswered; removed once replied

    // Lock & Agent Claim info
    public string? ClaimedByAgentId { get; set; }
    public string? ClaimedByUsername { get; set; }
    public string? ClaimedByName { get; set; }
    public string? ClaimedByAvatar { get; set; }
    public string? ClaimedAt { get; set; }

    // Auto-assignment details (from Dribbble Auto-Assigning Agents concept)
    public bool IsAutoAssigned { get; set; } = false;
    public string? AutoAssignedAt { get; set; }

    public string LastMessageText { get; set; } = string.Empty;
    public string LastMessageTime { get; set; } = "10.28 A.M.";
    public string DateStr { get; set; } = "10.28.2026";
    public string DateFormatted { get; set; } = "28th OCT 2026";

    public List<Message> Messages { get; set; } = new();

    // CRM & Lead Pipeline Extensions (inspired by Kirrivan video)
    public string Stage { get; set; } = "NEW"; // NEW | IN_PROGRESS | OPEN_DEAL | REPLIED | CLOSED
    public string? Company { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public decimal DealValue { get; set; } = 2500m;
    public string Priority { get; set; } = "High"; // High | Medium | Normal
    public List<LeadNote> Notes { get; set; } = new();
    public List<LeadTask> Tasks { get; set; } = new();

    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string? ClosedAt { get; set; }
}

public class LeadNote
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string Author { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class LeadTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string Title { get; set; } = string.Empty;
    public string AssignedTo { get; set; } = string.Empty;
    public string Priority { get; set; } = "High";
    public string DueDate { get; set; } = "Today, 12:00 PM";
    public bool IsCompleted { get; set; } = false;
}

public class LockState
{
    public string ConversationId { get; set; } = string.Empty;
    public string AgentId { get; set; } = string.Empty;
    public string AgentUsername { get; set; } = string.Empty;
    public string AgentName { get; set; } = string.Empty;
    public string AgentAvatar { get; set; } = string.Empty;
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddSeconds(30);
    public int TtlSeconds { get; set; } = 30;
}

public class AuditLog
{
    public string Id { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public string ActorUsername { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // CLAIM_CONVERSATION | SEND_REPLY | AUTO_ASSIGN | CREATE_USER
    public string TargetId { get; set; } = string.Empty;
    public string? TargetDescription { get; set; }
    public string? CustomerName { get; set; }
    public string? ReplyText { get; set; }
    public int? ResponseTimeSeconds { get; set; }
    public string? IpAddress { get; set; }
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
    public object? Details { get; set; }
}

public class AgentMetrics
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public int MessagesSentCount { get; set; }
    public int ConversationsHandledCount { get; set; }
    public int AverageResponseTimeSeconds { get; set; }
    public List<AgentRecentMessage> RecentMessages { get; set; } = new();
}

public class AgentRecentMessage
{
    public string MessageId { get; set; } = string.Empty;
    public string ConversationId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}
