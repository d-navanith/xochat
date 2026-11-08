export type UserRole = 'SUPER_ADMIN' | 'CORE_ADMIN' | 'AGENT';

export type ConversationStatus = 'PENDING' | 'CLAIMED' | 'REPLIED' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  createdAt: string;
  lastLoginAt?: string;
  createdById?: string;
  isOnline?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  passwordHash?: string;
  avatarUrl: string;
  email?: string;
  channel: string; // 'web_chat', 'customer_portal_3002', 'scraped_lead'
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'AGENT';
  senderId?: string; // agent user id if sent by agent
  senderName: string;
  senderUsername?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string; // ISO
  timeFormatted: string; // e.g. "10.28 A.M."
  dateFormatted: string; // e.g. "28th OCT 2026"
}

export interface LockState {
  conversationId: string;
  agentId: string;
  agentUsername: string;
  agentName: string;
  agentAvatar: string;
  acquiredAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  status: ConversationStatus;
  claimedByAgentId?: string;
  claimedByUsername?: string;
  claimedByName?: string;
  claimedByAvatar?: string;
  claimedAt?: string;
  hasReplied: boolean; // TRUE once a team member replied
  replyCount: number; // STRICTLY 0 or 1. Enforces "team members can reply only one reply can send"
  isUnansweredGreen: boolean; // Green color dot on user avatar; turns FALSE/removed once team member replies!
  lastMessageText: string;
  lastMessageTime: string;
  dateStr: string; // e.g. "10.28.2026"
  dateFormatted: string; // e.g. "28th OCT 2026"
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorName: string;
  actorRole: UserRole;
  action: 'LOGIN' | 'CLAIM_CONVERSATION' | 'RELEASE_LOCK' | 'SEND_REPLY' | 'RESOLVE_CONVERSATION' | 'CREATE_USER' | 'SCRAPE_AGENT_ACTIVITY';
  targetId?: string;
  targetDescription?: string;
  customerName?: string;
  replyText?: string;
  responseTimeSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface AgentMetrics {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  messagesSentCount: number;
  conversationsHandledCount: number;
  conversationsResolvedCount: number;
  averageResponseTimeSeconds: number;
  recentMessages: {
    messageId: string;
    conversationId: string;
    customerName: string;
    text: string;
    timestamp: string;
    responseTimeSeconds?: number;
  }[];
}
