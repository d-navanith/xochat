import type { User, Customer, Conversation, AgentMetrics, AuditLog } from '../types';

const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  window.location.port !== '' && 
  window.location.port !== '4000';

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? (isLocalDev ? `http://${window.location.hostname}:4000` : '');
const BASE_URL = `${BACKEND_BASE}/api`;

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCustomerAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('customer_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // --- Customer Auth ---
  async customerSignup(fullName: string, password: string): Promise<{ token: string; customer: Customer }> {
    const res = await fetch(`${BASE_URL}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to sign up');
    }
    return res.json();
  },

  async customerLogin(fullName: string, password: string): Promise<{ token: string; customer: Customer }> {
    const res = await fetch(`${BASE_URL}/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to login');
    }
    return res.json();
  },

  async getCustomerMe(): Promise<{ customer: Customer }> {
    const res = await fetch(`${BASE_URL}/auth/customer/me`, {
      headers: getCustomerAuthHeader(),
    });
    if (!res.ok) throw new Error('Customer not authenticated');
    return res.json();
  },

  // --- Team / Admin Auth ---
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to login');
    }
    return res.json();
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async getConversations(tab: 'all' | 'replied' | 'replied_mine' | 'mine', date?: string, agentId?: string): Promise<{
    conversations: Conversation[];
    inboxAll?: Conversation[];
    inboxMine?: Conversation[];
    repliedAll?: Conversation[];
    stats: {
      pendingCount: number;
      repliedCount: number;
      mineCount: number;
      myRepliedCount?: number;
      totalCount: number;
      totalRepliedCount?: number;
      totalPendingCount?: number;
      pendingDates?: { date: string; count: number }[];
    };
    activeLocks: Record<string, any>;
  }> {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (date) params.set('date', date);
    if (agentId) params.set('agentId', agentId);

    const res = await fetch(`${BASE_URL}/conversations?${params.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async simulateCustomerMessage(name?: string, text?: string): Promise<{ conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/conversations/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, text }),
    });
    if (!res.ok) throw new Error('Failed to simulate customer');
    return res.json();
  },

  async getTeamUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch team members');
    return res.json();
  },

  async createTeamUser(data: { username: string; password: string; name: string; role: string }): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  async getMetrics(): Promise<{ teamMetrics: AgentMetrics[]; summary: any }> {
    const res = await fetch(`${BASE_URL}/admin/metrics`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  async getScrapeActivity(filters?: { agentUsername?: string; customerQuery?: string; action?: string }): Promise<{
    totalEntries: number;
    activityStream: AuditLog[];
  }> {
    const params = new URLSearchParams();
    if (filters?.agentUsername) params.set('agentUsername', filters.agentUsername);
    if (filters?.customerQuery) params.set('customerQuery', filters.customerQuery);
    if (filters?.action) params.set('action', filters.action);

    const res = await fetch(`${BASE_URL}/admin/scrape-activity?${params.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch activity stream');
    return res.json();
  },

  async triggerScrapeTeamActivity(): Promise<{
    success: boolean;
    targetPortal: string;
    scrapedAt: string;
    totalScrapedActions: number;
    scrapedAgents: {
      username: string;
      name: string;
      avatarUrl: string;
      isOnline: boolean;
      repliesCount: number;
      handledCount: number;
    }[];
    activityStream: AuditLog[];
  }> {
    const res = await fetch(`${BASE_URL}/admin/scrape-team-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) throw new Error('Failed to scrape team portal');
    return res.json();
  },

  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getCustomerConversations(name: string): Promise<{
    conversations: Conversation[];
    activeConversation?: Conversation | null;
    isWaitingForReply?: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/conversations/customer/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error('Failed to fetch customer conversations');
    return res.json();
  },

  async getPipelineData(): Promise<{
    leads: Conversation[];
    agents: User[];
    stageStats: Record<string, number>;
    totalPipelineValue: number;
    totalLeads: number;
  }> {
    const res = await fetch(`${BASE_URL}/admin/pipeline`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch pipeline data');
    return res.json();
  },

  async updateLeadStage(id: string, stage: string): Promise<{ success: boolean; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) throw new Error('Failed to update stage');
    return res.json();
  },

  async addLeadNote(id: string, text: string, author?: string): Promise<{ success: boolean; note: any; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ text, author }),
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  async addLeadTask(id: string, task: { title: string; assignedTo?: string; dueDate?: string; priority?: string }): Promise<{ success: boolean; task: any; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to add task');
    return res.json();
  },

  async toggleLeadTask(id: string, taskId: string): Promise<{ success: boolean; task: any; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  async sendLeadEmail(id: string, payload: { subject?: string; toEmail?: string; bodyText: string; createFollowUpTask?: boolean }): Promise<{ success: boolean; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to send email');
    return res.json();
  },

  async reassignLead(id: string, payload: { agentId: string; username: string; name: string; avatarUrl?: string }): Promise<{ success: boolean; conversation: Conversation }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${id}/reassign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to reassign lead');
    return res.json();
  },

  async getAssistantTeamMembers(): Promise<{ members: any[] }> {
    const res = await fetch(`${BASE_URL}/admin/assistant/team-members`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch assistant team members');
    return res.json();
  },

  async getAgentDossier(username: string): Promise<{ dossier: any }> {
    const res = await fetch(`${BASE_URL}/admin/assistant/dossier/${encodeURIComponent(username)}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(`Failed to fetch dossier for @${username}`);
    return res.json();
  },

  async queryAssistant(query: string, selectedUsername?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/assistant/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ query, selectedUsername }),
    });
    if (!res.ok) throw new Error('Failed to query AI assistant');
    return res.json();
  },

  async deleteAgentMessage(conversationId: string, messageId: string): Promise<{ success: boolean; conversation: Conversation; message: string }> {
    const res = await fetch(`${BASE_URL}/admin/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete message');
    }
    return res.json();
  },
};
