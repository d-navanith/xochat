using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Xochat.Hubs;
using Xochat.Models;

namespace Xochat.Services;

public interface IAutoAssignService
{
    bool IsAutoAssignEnabled { get; set; }
    void RegisterOnlineAgent(string agentId, string username, string name, string avatarUrl, string connectionId);
    void UnregisterAgent(string connectionId);
    List<ConnectedAgent> GetOnlineAgents();
    Conversation? AutoAssignInquiry(string conversationId);
    List<Conversation> AutoAssignPendingQueue();
}

public class ConnectedAgent
{
    public string AgentId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
}

public class AutoAssignService : IAutoAssignService
{
    private readonly IDataStore _dataStore;
    private readonly ILockManager _lockManager;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ConcurrentDictionary<string, ConnectedAgent> _onlineAgents = new(); // ConnectionId -> Agent
    private int _roundRobinIndex = 0;

    public bool IsAutoAssignEnabled { get; set; } = true;

    public AutoAssignService(
        IDataStore dataStore,
        ILockManager lockManager,
        IHubContext<ChatHub> hubContext)
    {
        _dataStore = dataStore;
        _lockManager = lockManager;
        _hubContext = hubContext;
    }

    public void RegisterOnlineAgent(string agentId, string username, string name, string avatarUrl, string connectionId)
    {
        _onlineAgents[connectionId] = new ConnectedAgent
        {
            AgentId = agentId,
            Username = username,
            Name = name,
            AvatarUrl = avatarUrl,
            ConnectionId = connectionId,
            ConnectedAt = DateTime.UtcNow
        };
    }

    public void UnregisterAgent(string connectionId)
    {
        _onlineAgents.TryRemove(connectionId, out _);
    }

    public List<ConnectedAgent> GetOnlineAgents()
    {
        // Deduplicate agents across multiple open tabs
        return _onlineAgents.Values
            .GroupBy(a => a.AgentId)
            .Select(g => g.First())
            .ToList();
    }

    public Conversation? AutoAssignInquiry(string conversationId)
    {
        if (!IsAutoAssignEnabled) return null;

        var online = GetOnlineAgents();
        if (online.Count == 0)
        {
            // Fallback to all registered agents in store if no live socket connected yet
            var storeAgents = _dataStore.GetUsers().Where(u => u.Role == UserRoles.Agent).ToList();
            if (storeAgents.Count == 0) return null;

            var chosen = storeAgents[Math.Abs(Interlocked.Increment(ref _roundRobinIndex)) % storeAgents.Count];
            return PerformAssignment(conversationId, chosen.Id, chosen.Username, chosen.Name, chosen.AvatarUrl);
        }

        // Pick least busy agent (calculating currently assigned pending items)
        var pendingConvs = _dataStore.GetConversations().Where(c => c.Status == "PENDING" && !c.HasReplied).ToList();
        var agentLoads = online.Select(a => new
        {
            Agent = a,
            Load = pendingConvs.Count(c => c.ClaimedByAgentId == a.AgentId)
        }).OrderBy(x => x.Load).ToList();

        var selectedAgent = agentLoads.First().Agent;
        return PerformAssignment(conversationId, selectedAgent.AgentId, selectedAgent.Username, selectedAgent.Name, selectedAgent.AvatarUrl);
    }

    public List<Conversation> AutoAssignPendingQueue()
    {
        var assigned = new List<Conversation>();
        var unassignedPending = _dataStore.GetConversations()
            .Where(c => c.Status == "PENDING" && !c.HasReplied && string.IsNullOrEmpty(c.ClaimedByAgentId))
            .ToList();

        foreach (var conv in unassignedPending)
        {
            var res = AutoAssignInquiry(conv.Id);
            if (res != null) assigned.Add(res);
        }
        return assigned;
    }

    private Conversation? PerformAssignment(string conversationId, string agentId, string username, string name, string avatar)
    {
        var now = DateTime.UtcNow;
        var updated = _dataStore.UpdateConversation(conversationId, c =>
        {
            c.ClaimedByAgentId = agentId;
            c.ClaimedByUsername = username;
            c.ClaimedByName = name;
            c.ClaimedByAvatar = avatar;
            c.ClaimedAt = now.ToString("o");
            c.IsAutoAssigned = true;
            c.AutoAssignedAt = now.ToString("o");
        });

        if (updated != null)
        {
            // Log audit
            _dataStore.LogAudit(new AuditLog
            {
                ActorId = "SYSTEM_AUTOMATION",
                ActorUsername = "auto_assigner",
                ActorName = "Automated HelpDesk Router",
                ActorRole = "SYSTEM",
                Action = "AUTO_ASSIGN",
                TargetId = conversationId,
                CustomerName = updated.CustomerName,
                TargetDescription = $"Automated routing assigned {updated.CustomerName} to @{username} ({name})"
            });

            // SignalR broadcast: auto-assigned to agent (NO lock acquired! Lock is ONLY acquired when agent clicks Reply)
            _hubContext.Clients.All.SendAsync("conversation:auto_assigned", new
            {
                conversationId,
                conversation = updated
            });
        }

        return updated;
    }
}
