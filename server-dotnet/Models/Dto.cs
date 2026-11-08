namespace Xochat.Models;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string? SecretCode { get; set; }
}

public class CustomerLoginRequest
{
    public string? FullName { get; set; }
    public string? Name { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class CustomerSignupRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Email { get; set; }
}

public class CreateTeamUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.Agent;
}

public class SimulateInquiryRequest
{
    public string? CustomerName { get; set; }
    public string? Text { get; set; }
    public string? Email { get; set; }
}

public class SendMessageRequest
{
    public string ConversationId { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class UpdateLeadStageRequest
{
    public string Stage { get; set; } = string.Empty;
}

public class AddLeadNoteRequest
{
    public string? Author { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class AddLeadTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? DueDate { get; set; }
    public string? Priority { get; set; }
}

public class SendLeadEmailRequest
{
    public string? Subject { get; set; }
    public string? ToEmail { get; set; }
    public string BodyText { get; set; } = string.Empty;
    public bool CreateFollowUpTask { get; set; } = false;
}

public class ReassignLeadRequest
{
    public string AgentId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}
