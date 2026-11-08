using Xochat.Models;

namespace Xochat.Services;

public interface IMetricsService
{
    (List<AgentMetrics> TeamMetrics, object Summary) GetTeamMetrics();
}

public class MetricsService : IMetricsService
{
    private readonly IDataStore _dataStore;

    public MetricsService(IDataStore dataStore)
    {
        _dataStore = dataStore;
    }

    public (List<AgentMetrics> TeamMetrics, object Summary) GetTeamMetrics()
    {
        var users = _dataStore.GetUsers();
        var conversations = _dataStore.GetConversations();
        var auditLogs = _dataStore.GetAuditLogs();

        var teamMetrics = new List<AgentMetrics>();

        foreach (var user in users)
        {
            // Find all agent replies sent by this user
            var agentMessages = new List<AgentRecentMessage>();
            var responseTimes = new List<int>();

            foreach (var conv in conversations)
            {
                foreach (var msg in conv.Messages)
                {
                    if (msg.SenderType == "AGENT" && (msg.SenderId == user.Id || msg.SenderUsername == user.Username))
                    {
                        agentMessages.Add(new AgentRecentMessage
                        {
                            MessageId = msg.Id,
                            ConversationId = conv.Id,
                            CustomerName = conv.CustomerName,
                            Text = msg.Text,
                            Timestamp = msg.Timestamp
                        });
                    }
                }
            }

            // Collect response times from audit logs
            var userAudits = auditLogs.Where(l => l.ActorId == user.Id || l.ActorUsername == user.Username).ToList();
            foreach (var audit in userAudits)
            {
                if (audit.ResponseTimeSeconds.HasValue && audit.ResponseTimeSeconds.Value > 0)
                {
                    responseTimes.Add(audit.ResponseTimeSeconds.Value);
                }
            }

            var handledCount = conversations.Count(c =>
                c.ClaimedByAgentId == user.Id || c.ClaimedByUsername == user.Username);

            var avgResponseTime = responseTimes.Count > 0 ? (int)Math.Round(responseTimes.Average()) : 45;

            teamMetrics.Add(new AgentMetrics
            {
                UserId = user.Id,
                Username = user.Username,
                Name = user.Name,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl,
                MessagesSentCount = agentMessages.Count,
                ConversationsHandledCount = handledCount,
                AverageResponseTimeSeconds = avgResponseTime,
                RecentMessages = agentMessages.OrderByDescending(m => m.Timestamp).Take(10).ToList()
            });
        }

        var totalPending = conversations.Count(c => !c.HasReplied && c.Status == "PENDING");
        var totalReplied = conversations.Count(c => c.HasReplied || c.Status == "REPLIED");
        var totalMessages = conversations.Sum(c => c.Messages.Count(m => m.SenderType == "AGENT"));

        var summary = new
        {
            totalConversations = conversations.Count,
            pendingCount = totalPending,
            repliedCount = totalReplied,
            totalAgentMessages = totalMessages,
            totalTeamMembers = users.Count
        };

        return (teamMetrics, summary);
    }
}
