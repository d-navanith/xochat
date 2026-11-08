using System.Collections.Concurrent;
using System.Text.Json;
using Xochat.Models;

namespace Xochat.Services;

public interface IDataStore
{
    List<User> GetUsers();
    User? GetUserByUsername(string username);
    User? GetUserById(string id);
    User CreateUser(string username, string password, string name, string role);

    List<Customer> GetCustomers();
    Customer? GetCustomerById(string id);
    Customer? GetCustomerByName(string name);
    Customer GetOrCreateCustomer(string name, string? email = null);
    Customer CreateCustomerWithPassword(string name, string passwordHash, string? email = null);

    List<Conversation> GetConversations();
    Conversation? GetConversationById(string id);
    void CreateConversation(Conversation conversation);
    Conversation? UpdateConversation(string id, Action<Conversation> updateAction);
    void AddMessage(string conversationId, Message message);

    LeadNote? AddLeadNote(string conversationId, string author, string text);
    LeadTask? AddLeadTask(string conversationId, string title, string assignedTo, string dueDate, string priority);
    LeadTask? ToggleLeadTask(string conversationId, string taskId);
    (bool Success, string? Error, Conversation? Conversation) DeleteAgentMessage(string conversationId, string messageId, bool isSuperAdmin);

    List<AuditLog> GetAuditLogs();
    void LogAudit(AuditLog log);

    void ResetSeed();

    /// <summary>
    /// Wipes all chat data (conversations + audit logs) while keeping team users and customer accounts.
    /// A timestamped backup of db.json is written first. Returns the backup file path.
    /// </summary>
    string CleanChatData();
}

public class DataStore : IDataStore
{
    private readonly string _dbPath;
    private readonly object _lock = new();

    private List<User> _users = new();
    private List<Customer> _customers = new();
    private List<Conversation> _conversations = new();
    private List<AuditLog> _auditLogs = new();

    public DataStore(IWebHostEnvironment env)
    {
        var dataDir = Path.Combine(env.ContentRootPath, "Data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        _dbPath = Path.Combine(dataDir, "db.json");

        LoadOrSeed();
    }

    private void LoadOrSeed()
    {
        lock (_lock)
        {
            if (File.Exists(_dbPath))
            {
                try
                {
                    var json = File.ReadAllText(_dbPath);
                    var schema = JsonSerializer.Deserialize<DatabaseSchema>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (schema != null && schema.Users.Count > 0)
                    {
                        _users = schema.Users;
                        _customers = schema.Customers;
                        _conversations = schema.Conversations;
                        _auditLogs = schema.AuditLogs;
                        foreach (var c in _conversations)
                        {
                            EnsureCrmFields(c);
                        }
                        return;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error loading existing db.json, reseeding: {ex.Message}");
                }
            }

            SeedDefaults();
            Save();
        }
    }

    public void Save()
    {
        lock (_lock)
        {
            try
            {
                var schema = new DatabaseSchema
                {
                    Users = _users,
                    Customers = _customers,
                    Conversations = _conversations,
                    AuditLogs = _auditLogs
                };

                var json = JsonSerializer.Serialize(schema, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                File.WriteAllText(_dbPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving db.json: {ex.Message}");
            }
        }
    }

    public void ResetSeed()
    {
        lock (_lock)
        {
            SeedDefaults();
            Save();
        }
    }

    public string CleanChatData()
    {
        lock (_lock)
        {
            var backupPath = string.Empty;
            try
            {
                if (File.Exists(_dbPath))
                {
                    backupPath = Path.Combine(
                        Path.GetDirectoryName(_dbPath)!,
                        $"db.backup-{DateTime.Now:yyyyMMdd-HHmmss}.json");
                    File.Copy(_dbPath, backupPath, overwrite: true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: could not back up db.json before cleaning: {ex.Message}");
            }

            // Keep team users & customer accounts so every login keeps working.
            _conversations = new List<Conversation>();
            _auditLogs = new List<AuditLog>();
            Save();
            return backupPath;
        }
    }

    private void SeedDefaults()
    {
        var hashAdmin = BCrypt.Net.BCrypt.HashPassword("admin123");
        var hashMurdock = BCrypt.Net.BCrypt.HashPassword("murdock123");
        var hashLisa = BCrypt.Net.BCrypt.HashPassword("lisa123");
        var hashJohn = BCrypt.Net.BCrypt.HashPassword("john123");
        var hashCustomer = BCrypt.Net.BCrypt.HashPassword("password123");

        _users = new List<User>
        {
            new()
            {
                Id = "usr_super_1",
                Username = "superadmin",
                Name = "Alexander Vance",
                PasswordHash = hashAdmin,
                Role = UserRoles.SuperAdmin,
                AvatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=superadmin"
            },
            new()
            {
                Id = "usr_core_1",
                Username = "coreadmin",
                Name = "Elena Rostova",
                PasswordHash = hashAdmin,
                Role = UserRoles.CoreAdmin,
                AvatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=coreadmin"
            },
            new()
            {
                Id = "usr_murdock_1",
                Username = "murdock",
                Name = "H.M. Murdock",
                PasswordHash = hashMurdock,
                Role = UserRoles.Agent,
                AvatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=murdock&accessories[]=eyepatch&hairColor=auburn"
            },
            new()
            {
                Id = "usr_lisa_1",
                Username = "lisa",
                Name = "Lisa Ray",
                PasswordHash = hashLisa,
                Role = UserRoles.Agent,
                AvatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa&hairColor=black"
            },
            new()
            {
                Id = "usr_john_1",
                Username = "john",
                Name = "John Miller",
                PasswordHash = hashJohn,
                Role = UserRoles.Agent,
                AvatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=john&hairColor=blonde"
            }
        };

        var pendingSeeds = new (string Name, string Query, string Time)[]
        {
            ("Theodore T.C. Calvin", "Lorem ipsum turpis pharetra et ipsum massa?", "10.28 A.M."),
            ("Dori Doreau", "Lorem ipsum varius iaculis at interdum scelerisque.", "10.28 A.M."),
            ("Gina Calabrese", "Figma ipsum component prototype resizing create flatten.", "10.28 A.M."),
            ("Jesse Katsopolis", "Crypto ipsum audius serum chainlink ICON telcoin.", "10.28 A.M."),
            ("Jazz Jeff", "Office ipsum you must be", "10.28 A.M."),
            ("Vivian Banks", "Hipster ipsum try-hard portland ipsum chicken hell.", "10.28 A.M."),
            ("Arthur Pendelton", "Can you provide the shipping manifest for delivery #882?", "10.25 A.M."),
            ("Carlos Gomez", "Is this available for expedited freight pickup today?", "10.22 A.M."),
            ("Samantha Vance", "Need a revised rate confirmation on load ref 4091.", "10.15 A.M."),
            ("Marcus Sterling", "What are the customs clearance requirements for this lane?", "10.10 A.M."),
            ("Chloe Bennett", "Payment processed but status still showing as pending.", "10.05 A.M.")
        };

        _customers = new List<Customer>();
        _conversations = new List<Conversation>();

        for (int i = 0; i < pendingSeeds.Length; i++)
        {
            var seed = pendingSeeds[i];
            var custId = $"cust_pending_{i + 1}";
            var convId = $"conv_pending_{i + 1}";
            var avatarUrl = $"https://api.dicebear.com/7.x/personas/svg?seed={Uri.EscapeDataString(seed.Name)}";

            _customers.Add(new Customer
            {
                Id = custId,
                Name = seed.Name,
                PasswordHash = hashCustomer,
                AvatarUrl = avatarUrl,
                Channel = "customer_portal_3002",
                CreatedAt = "2026-10-28T04:45:00.000Z"
            });

            var msg = new Message
            {
                Id = $"msg_seed_{i + 1}",
                ConversationId = convId,
                SenderType = "CUSTOMER",
                SenderName = seed.Name,
                SenderAvatar = avatarUrl,
                Text = seed.Query,
                Timestamp = "2026-10-28T04:48:00.000Z",
                TimeFormatted = seed.Time,
                DateFormatted = "28th OCT 2026"
            };

            _conversations.Add(new Conversation
            {
                Id = convId,
                CustomerId = custId,
                CustomerName = seed.Name,
                CustomerAvatar = avatarUrl,
                Status = "PENDING",
                HasReplied = false,
                ReplyCount = 0,
                IsUnansweredGreen = true, // GREEN COLOR MARK ACTIVE!
                LastMessageText = seed.Query,
                LastMessageTime = seed.Time,
                DateStr = "10.28.2026",
                DateFormatted = "28th OCT 2026",
                Messages = new List<Message> { msg },
                CreatedAt = "2026-10-28T04:45:00.000Z",
                UpdatedAt = "2026-10-28T04:48:00.000Z"
            });
        }

        // Add 1 Replied sample conversation to populate the Replied Box
        var repliedCustName = "Martin Riggs";
        var repliedCustId = "cust_replied_1";
        var repliedConvId = "conv_replied_1";
        var repliedAvatar = $"https://api.dicebear.com/7.x/personas/svg?seed={Uri.EscapeDataString(repliedCustName)}";

        _customers.Add(new Customer
        {
            Id = repliedCustId,
            Name = repliedCustName,
            PasswordHash = hashCustomer,
            AvatarUrl = repliedAvatar,
            Channel = "customer_portal_3002",
            CreatedAt = "2026-10-28T03:10:00.000Z"
        });

        _conversations.Add(new Conversation
        {
            Id = repliedConvId,
            CustomerId = repliedCustId,
            CustomerName = repliedCustName,
            CustomerAvatar = repliedAvatar,
            Status = "REPLIED",
            HasReplied = true,
            ReplyCount = 1,
            IsUnansweredGreen = false, // Green dot removed!
            ClaimedByAgentId = "usr_murdock_1",
            ClaimedByUsername = "murdock",
            ClaimedByName = "H.M. Murdock",
            ClaimedByAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=murdock&accessories[]=eyepatch&hairColor=auburn",
            ClaimedAt = "2026-10-28T03:11:00.000Z",
            LastMessageText = "Your container was cleared through customs.",
            LastMessageTime = "10.22 A.M.",
            DateStr = "10.28.2026",
            DateFormatted = "28th OCT 2026",
            Messages = new List<Message>
            {
                new()
                {
                    Id = "msg_replied_cust",
                    ConversationId = repliedConvId,
                    SenderType = "CUSTOMER",
                    SenderName = repliedCustName,
                    SenderAvatar = repliedAvatar,
                    Text = "Can you check status of container #4092?",
                    Timestamp = "2026-10-28T03:10:00.000Z",
                    TimeFormatted = "10.20 A.M.",
                    DateFormatted = "28th OCT 2026"
                },
                new()
                {
                    Id = "msg_replied_agent",
                    ConversationId = repliedConvId,
                    SenderType = "AGENT",
                    SenderId = "usr_murdock_1",
                    SenderUsername = "murdock",
                    SenderName = "H.M. Murdock",
                    Text = "Your container was cleared through customs.",
                    Timestamp = "2026-10-28T03:12:00.000Z",
                    TimeFormatted = "10.22 A.M.",
                    DateFormatted = "28th OCT 2026"
                }
            },
            CreatedAt = "2026-10-28T03:10:00.000Z",
            UpdatedAt = "2026-10-28T03:12:00.000Z",
            ClosedAt = "2026-10-28T03:12:00.000Z"
        });

        _auditLogs = new List<AuditLog>
        {
            new()
            {
                Id = "aud_init_1",
                ActorId = "usr_super_1",
                ActorUsername = "superadmin",
                ActorName = "Alexander Vance",
                ActorRole = UserRoles.SuperAdmin,
                Action = "CREATE_USER",
                TargetId = "usr_murdock_1",
                TargetDescription = "Provisioned Agent account @murdock",
                Timestamp = "2026-10-10T08:00:00.000Z"
            }
        };
    }

    public List<User> GetUsers()
    {
        lock (_lock) return _users.ToList();
    }

    public User? GetUserByUsername(string username)
    {
        lock (_lock)
        {
            return _users.FirstOrDefault(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase));
        }
    }

    public User? GetUserById(string id)
    {
        lock (_lock)
        {
            return _users.FirstOrDefault(u => u.Id == id);
        }
    }

    public User CreateUser(string username, string password, string name, string role)
    {
        lock (_lock)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword(password);
            var newUser = new User
            {
                Id = $"usr_{username.ToLower()}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Username = username.ToLower().Trim(),
                Name = name.Trim(),
                PasswordHash = hash,
                Role = role,
                AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(username)}"
            };

            _users.Add(newUser);
            Save();
            return newUser;
        }
    }

    public List<Customer> GetCustomers()
    {
        lock (_lock) return _customers.ToList();
    }

    public Customer? GetCustomerById(string id)
    {
        lock (_lock) return _customers.FirstOrDefault(c => c.Id == id);
    }

    public Customer? GetCustomerByName(string name)
    {
        lock (_lock)
        {
            var clean = name.Trim();
            if (clean.Length == 0) return null;

            // 1. Exact (case-insensitive) match always wins, so two customers with
            //    overlapping names (e.g. "Jazz" and "Jazz Jeff") never get mixed up.
            var exact = _customers.FirstOrDefault(c =>
                string.Equals(c.Name.Trim(), clean, StringComparison.OrdinalIgnoreCase));
            if (exact != null) return exact;

            // 2. Login convenience fallback (e.g. "Theodore" -> "Theodore T.C. Calvin")
            return _customers.FirstOrDefault(c =>
                c.Name.StartsWith(clean, StringComparison.OrdinalIgnoreCase) ||
                clean.StartsWith(c.Name, StringComparison.OrdinalIgnoreCase));
        }
    }

    public Customer GetOrCreateCustomer(string name, string? email = null)
    {
        lock (_lock)
        {
            var existing = GetCustomerByName(name);
            if (existing != null) return existing;

            var newCust = new Customer
            {
                Id = $"cust_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Name = name.Trim(),
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                AvatarUrl = $"https://api.dicebear.com/7.x/personas/svg?seed={Uri.EscapeDataString(name.Trim())}",
                Channel = "customer_portal_3002"
            };

            _customers.Add(newCust);
            Save();
            return newCust;
        }
    }

    public Customer CreateCustomerWithPassword(string name, string passwordHash, string? email = null)
    {
        lock (_lock)
        {
            var newCust = new Customer
            {
                Id = $"cust_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Name = name.Trim(),
                Email = email,
                PasswordHash = passwordHash,
                AvatarUrl = $"https://api.dicebear.com/7.x/personas/svg?seed={Uri.EscapeDataString(name.Trim())}",
                Channel = "customer_portal_3002"
            };

            _customers.Add(newCust);
            Save();
            return newCust;
        }
    }

    public List<Conversation> GetConversations()
    {
        lock (_lock) return _conversations.ToList();
    }

    public Conversation? GetConversationById(string id)
    {
        lock (_lock) return _conversations.FirstOrDefault(c => c.Id == id);
    }

    public void CreateConversation(Conversation conversation)
    {
        lock (_lock)
        {
            EnsureCrmFields(conversation);
            _conversations.Insert(0, conversation);
            Save();
        }
    }

    private static readonly string[] SampleCompanies = { "Google inc.", "Swell Logistics", "Apex Freight", "CargoDirect Inc", "Pacific Carriers", "Echo Global", "C.H. Robinson" };

    private void EnsureCrmFields(Conversation c)
    {
        if (string.IsNullOrEmpty(c.Stage))
        {
            c.Stage = (c.HasReplied || c.Status == "REPLIED") ? "REPLIED" 
                    : (!string.IsNullOrEmpty(c.ClaimedByAgentId) ? "IN_PROGRESS" : "NEW");
        }
        if (string.IsNullOrEmpty(c.Company))
        {
            var hash = Math.Abs(c.CustomerName.GetHashCode());
            c.Company = SampleCompanies[hash % SampleCompanies.Length];
        }
        if (string.IsNullOrEmpty(c.CustomerEmail))
        {
            var clean = c.CustomerName.ToLower().Replace(" ", ".").Replace("'", "");
            c.CustomerEmail = $"{clean}@example.com";
        }
        if (string.IsNullOrEmpty(c.CustomerPhone))
        {
            var hash = Math.Abs(c.CustomerName.GetHashCode());
            c.CustomerPhone = $"(405) 555-{1000 + (hash % 8999)}";
        }
        if (c.DealValue <= 0)
        {
            var hash = Math.Abs(c.CustomerName.GetHashCode());
            c.DealValue = 1500m + ((hash % 10) * 1200m);
        }
        if (string.IsNullOrEmpty(c.Priority))
        {
            c.Priority = (c.DealValue > 5000m) ? "High" : ((c.DealValue > 2500m) ? "Medium" : "Normal");
        }
        if (c.Notes == null) c.Notes = new();
        if (c.Tasks == null) c.Tasks = new();

        if (c.Notes.Count == 0)
        {
            c.Notes.Add(new LeadNote
            {
                Id = $"note_init_{c.Id}",
                Author = string.IsNullOrEmpty(c.ClaimedByName) ? "System Automation" : c.ClaimedByName,
                Text = $"Customer submitted inquiry: \"{c.LastMessageText}\". Initial stage flagged as {c.Stage}.",
                CreatedAt = c.CreatedAt
            });
        }
        if (c.Tasks.Count == 0)
        {
            c.Tasks.Add(new LeadTask
            {
                Id = $"task_init_{c.Id}",
                Title = $"Follow up on rate quote for {c.CustomerName}",
                AssignedTo = string.IsNullOrEmpty(c.ClaimedByName) ? "H.M. Murdock" : c.ClaimedByName,
                Priority = c.Priority,
                DueDate = "Today, 12:00 PM",
                IsCompleted = c.HasReplied
            });
        }
    }

    public LeadNote? AddLeadNote(string conversationId, string author, string text)
    {
        lock (_lock)
        {
            var conv = _conversations.FirstOrDefault(c => c.Id == conversationId);
            if (conv == null) return null;
            if (conv.Notes == null) conv.Notes = new();

            var note = new LeadNote
            {
                Id = $"note_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Author = author,
                Text = text,
                CreatedAt = DateTime.UtcNow.ToString("o")
            };
            conv.Notes.Insert(0, note);
            conv.UpdatedAt = DateTime.UtcNow.ToString("o");
            Save();
            return note;
        }
    }

    public LeadTask? AddLeadTask(string conversationId, string title, string assignedTo, string dueDate, string priority)
    {
        lock (_lock)
        {
            var conv = _conversations.FirstOrDefault(c => c.Id == conversationId);
            if (conv == null) return null;
            if (conv.Tasks == null) conv.Tasks = new();

            var task = new LeadTask
            {
                Id = $"task_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Title = title,
                AssignedTo = assignedTo,
                DueDate = string.IsNullOrWhiteSpace(dueDate) ? "Today, 12:00 PM" : dueDate,
                Priority = string.IsNullOrWhiteSpace(priority) ? "High" : priority,
                IsCompleted = false
            };
            conv.Tasks.Insert(0, task);
            conv.UpdatedAt = DateTime.UtcNow.ToString("o");
            Save();
            return task;
        }
    }

    public LeadTask? ToggleLeadTask(string conversationId, string taskId)
    {
        lock (_lock)
        {
            var conv = _conversations.FirstOrDefault(c => c.Id == conversationId);
            if (conv == null || conv.Tasks == null) return null;

            var task = conv.Tasks.FirstOrDefault(t => t.Id == taskId);
            if (task == null) return null;

            task.IsCompleted = !task.IsCompleted;
            conv.UpdatedAt = DateTime.UtcNow.ToString("o");
            Save();
            return task;
        }
    }

    public (bool Success, string? Error, Conversation? Conversation) DeleteAgentMessage(string conversationId, string messageId, bool isSuperAdmin)
    {
        lock (_lock)
        {
            if (!isSuperAdmin)
            {
                return (false, "Access Denied: Only Super Admin can delete team member messages.", null);
            }

            var conv = _conversations.FirstOrDefault(c => c.Id == conversationId);
            if (conv == null)
            {
                return (false, "Conversation not found.", null);
            }

            var msg = conv.Messages.FirstOrDefault(m => m.Id == messageId);
            if (msg == null)
            {
                return (false, "Message not found in conversation.", null);
            }

            if (msg.SenderType != "AGENT")
            {
                return (false, "Only team member messages sent to clients can be deleted.", null);
            }

            // Enforce immediate time only: within 10 minutes (600 seconds) of timestamp
            if (DateTime.TryParse(msg.Timestamp, out var msgTime))
            {
                var elapsed = Math.Abs((DateTime.UtcNow - msgTime.ToUniversalTime()).TotalSeconds);
                if (elapsed > 600)
                {
                    return (false, "Immediate deletion window expired. Messages can only be deleted within 10 minutes of sending.", null);
                }
            }

            // Remove the message completely
            conv.Messages.Remove(msg);

            // Re-evaluate conversation status & single-reply limit
            var remainingAgentReplies = conv.Messages.Where(m => m.SenderType == "AGENT").ToList();
            conv.ReplyCount = remainingAgentReplies.Count;

            if (remainingAgentReplies.Count == 0)
            {
                conv.HasReplied = false;
                conv.Status = "PENDING";
                conv.IsUnansweredGreen = true; // Green dot returns because customer is waiting for a reply again!
                conv.ClosedAt = null;
                conv.Stage = "NEW";
                var last = conv.Messages.LastOrDefault();
                conv.LastMessageText = last?.Text ?? "Inquiry awaiting reply";
                conv.LastMessageTime = last?.TimeFormatted ?? "Just now";
            }
            else
            {
                var last = conv.Messages.LastOrDefault();
                conv.LastMessageText = last?.Text ?? "";
                conv.LastMessageTime = last?.TimeFormatted ?? "";
            }

            conv.UpdatedAt = DateTime.UtcNow.ToString("o");
            Save();

            // Log security audit for Super Admin action
            LogAudit(new AuditLog
            {
                ActorId = "usr_super_1",
                ActorUsername = "superadmin",
                ActorName = "Alexander Vance",
                ActorRole = UserRoles.SuperAdmin,
                Action = "DELETE_AGENT_MESSAGE",
                TargetId = messageId,
                CustomerName = conv.CustomerName,
                TargetDescription = $"Super Admin immediately deleted team message '{msg.Text}' sent by @{msg.SenderUsername} to {conv.CustomerName}"
            });

            return (true, null, conv);
        }
    }

    public Conversation? UpdateConversation(string id, Action<Conversation> updateAction)
    {
        lock (_lock)
        {
            var conv = _conversations.FirstOrDefault(c => c.Id == id);
            if (conv != null)
            {
                updateAction(conv);
                conv.UpdatedAt = DateTime.UtcNow.ToString("o");
                Save();
            }
            return conv;
        }
    }

    public void AddMessage(string conversationId, Message message)
    {
        lock (_lock)
        {
            var conv = _conversations.FirstOrDefault(c => c.Id == conversationId);
            if (conv != null)
            {
                conv.Messages.Add(message);
                conv.LastMessageText = message.Text;
                conv.LastMessageTime = message.TimeFormatted;
                conv.UpdatedAt = DateTime.UtcNow.ToString("o");
                Save();
            }
        }
    }

    public List<AuditLog> GetAuditLogs()
    {
        lock (_lock) return _auditLogs.ToList();
    }

    public void LogAudit(AuditLog log)
    {
        lock (_lock)
        {
            if (string.IsNullOrEmpty(log.Id))
            {
                log.Id = $"aud_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
            }
            if (string.IsNullOrEmpty(log.Timestamp))
            {
                log.Timestamp = DateTime.UtcNow.ToString("o");
            }
            _auditLogs.Insert(0, log);
            Save();
        }
    }

    private class DatabaseSchema
    {
        public List<User> Users { get; set; } = new();
        public List<Customer> Customers { get; set; } = new();
        public List<Conversation> Conversations { get; set; } = new();
        public List<AuditLog> AuditLogs { get; set; } = new();
    }
}
