using System.Collections.Concurrent;
using Xochat.Models;

namespace Xochat.Services;

public class LockResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public LockState? Lock { get; set; }
}

public interface ILockManager
{
    LockResult AcquireLock(string conversationId, string agentId, string username, string name, string avatar);
    bool ReleaseLock(string conversationId, string agentId, bool force = false);
    List<string> ReleaseAllByAgent(string agentId);
    LockState? GetLock(string conversationId);
    Dictionary<string, LockState> GetAllActiveLocks();
    List<string> PurgeExpired();
    void ClearAll();
}

public class LockManager : ILockManager
{
    private readonly ConcurrentDictionary<string, LockState> _locks = new();
    private readonly int _defaultTtlSeconds = 30;

    public void ClearAll()
    {
        _locks.Clear();
    }

    public LockResult AcquireLock(string conversationId, string agentId, string username, string name, string avatar)
    {
        var now = DateTime.UtcNow;

        while (true)
        {
            if (_locks.TryGetValue(conversationId, out var existing))
            {
                // Check if expired
                if (now > existing.ExpiresAt)
                {
                    _locks.TryRemove(conversationId, out _);
                }
                else if (existing.AgentId == agentId)
                {
                    // Refresh lock for the same agent
                    existing.ExpiresAt = now.AddSeconds(_defaultTtlSeconds);
                    return new LockResult { Success = true, Message = "Lock extended", Lock = existing };
                }
                else
                {
                    return new LockResult
                    {
                        Success = false,
                        Message = $"Chat is currently locked by @{existing.AgentUsername} ({existing.AgentName})",
                        Lock = existing
                    };
                }
            }

            var newLock = new LockState
            {
                ConversationId = conversationId,
                AgentId = agentId,
                AgentUsername = username,
                AgentName = name,
                AgentAvatar = avatar,
                AcquiredAt = now,
                ExpiresAt = now.AddSeconds(_defaultTtlSeconds),
                TtlSeconds = _defaultTtlSeconds
            };

            if (_locks.TryAdd(conversationId, newLock))
            {
                return new LockResult { Success = true, Message = "Lock acquired", Lock = newLock };
            }
        }
    }

    public bool ReleaseLock(string conversationId, string agentId, bool force = false)
    {
        if (_locks.TryGetValue(conversationId, out var existing))
        {
            if (force || existing.AgentId == agentId)
            {
                return _locks.TryRemove(conversationId, out _);
            }
        }
        return false;
    }

    public List<string> ReleaseAllByAgent(string agentId)
    {
        var released = new List<string>();
        foreach (var kvp in _locks)
        {
            if (kvp.Value.AgentId == agentId)
            {
                if (_locks.TryRemove(kvp.Key, out _))
                {
                    released.Add(kvp.Key);
                }
            }
        }
        return released;
    }

    public LockState? GetLock(string conversationId)
    {
        if (_locks.TryGetValue(conversationId, out var state))
        {
            if (DateTime.UtcNow <= state.ExpiresAt)
            {
                return state;
            }
            _locks.TryRemove(conversationId, out _);
        }
        return null;
    }

    public Dictionary<string, LockState> GetAllActiveLocks()
    {
        var now = DateTime.UtcNow;
        var result = new Dictionary<string, LockState>();
        foreach (var kvp in _locks)
        {
            if (now <= kvp.Value.ExpiresAt)
            {
                result[kvp.Key] = kvp.Value;
            }
        }
        return result;
    }

    public List<string> PurgeExpired()
    {
        var now = DateTime.UtcNow;
        var expired = new List<string>();
        foreach (var kvp in _locks)
        {
            if (now > kvp.Value.ExpiresAt)
            {
                if (_locks.TryRemove(kvp.Key, out _))
                {
                    expired.Add(kvp.Key);
                }
            }
        }
        return expired;
    }
}
