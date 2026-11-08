export type UserRole = 'SUPER_ADMIN' | 'CORE_ADMIN' | 'AGENT';

export type ConversationStatus = 'PENDING' | 'CLAIMED' | 'REPLIED' | 'RESOLVED' | 'CLOSED';

export interface Customer {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'AGENT';
  senderId?: string;
  senderName: string;
  senderUsername?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
}

export interface LockState {
  conversationId: string;
  agentId: string;
  agentUsername: string;
  agentName: string;
  agentAvatar: string;
  acquiredAt: number;
  expiresAt: number;
}

export type LeadStage = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'OPEN_DEAL' | 'REPLIED' | 'CLOSED';

export interface LeadNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface LeadTask {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Normal' | string;
  dueDate: string;
  isCompleted: boolean;
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
  hasReplied: boolean; // True once an agent replies
  replyCount: number; // 0 or 1
  isUnansweredGreen: boolean; // Green dot on user avatar, removed once replied!
  lastMessageText: string;
  lastMessageTime: string;
  dateStr: string;
  dateFormatted: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  // Kirrivan CRM & Pipeline fields
  stage?: LeadStage | string;
  company?: string;
  customerEmail?: string;
  customerPhone?: string;
  dealValue?: number;
  priority?: 'High' | 'Medium' | 'Normal' | string;
  notes?: LeadNote[];
  tasks?: LeadTask[];
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

export interface AuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetDescription?: string;
  customerName?: string;
  replyText?: string;
  responseTimeSeconds?: number;
  ipAddress?: string;
  timestamp: string;
}

// AI Intelligence Assistant Types
export interface TeamMemberProfile {
  username: string;
  name: string;
  role: string;
  title: string;
  avatarUrl: string;
  isOnline: boolean;
  shift: string;
  timezone: string;
  joinDate: string;
  specializations: string[];
}

export interface TeamMemberDuty {
  summary: string;
  primaryDuties: string[];
  scopedChannels: string[];
  operationalStatus: string;
}

export interface MonthlyMessageStat {
  month: string;
  count: number;
  target: number;
}

export interface MessageCounts {
  todayCount: number;
  thisMonthCount: number;
  lastMonthCount: number;
  yearToDateCount: number;
  monthlyBreakdown: MonthlyMessageStat[];
}

export interface PerformanceMetrics {
  averageLatencySeconds: number;
  singleReplyComplianceRate: number;
  resolutionRate: number;
  collisionLocksPrevented: number;
  fastRepliesCount: number;
  slaAdherencePercent: number;
  ratingScore: number;
  velocityBadge: string;
}

export interface GoalProgress {
  category: string;
  currentAmount: number;
  targetAmount: number;
  percentage: number;
}

export interface DealRevenueForecast {
  companyGoalTarget: number;
  companyGoalCurrent: number;
  companyGoalPercentage: number;
  goalPeriod: string;
  teamGoals: GoalProgress[];
}

export interface PipelineStageDeal {
  stage: string;
  amount: number;
  dealsCount: number;
  badgeColor?: string;
}

export interface SalesPipeline {
  totalAmount: number;
  totalDeals: number;
  period: string;
  stages: PipelineStageDeal[];
}

export interface AmountByStage {
  totalAmount: number;
  period: string;
  stages: PipelineStageDeal[];
}

export interface PerformancePoint {
  date: string;
  open: number;
  replied: number;
  clicked: number;
}

export interface ResponsePerformanceReport {
  title: string;
  timeline: PerformancePoint[];
}

export interface HandledClient {
  conversationId: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  company: string;
  inquiryText: string;
  agentReplyText: string;
  responseLatencySeconds: number;
  dateStr: string;
  stage: string;
  dealValue: number;
  timestamp: string;
}

export interface TeamMemberDossier {
  profile: TeamMemberProfile;
  whatHeDoes: TeamMemberDuty;
  messageCounts: MessageCounts;
  performance: PerformanceMetrics;
  dealRevenueForecast: DealRevenueForecast;
  salesPipeline: SalesPipeline;
  amountByStage: AmountByStage;
  responsePerformanceReport: ResponsePerformanceReport;
  handledClients: HandledClient[];
}

export interface AiAssistantQueryResponse {
  answerText: string;
  targetUsername: string;
  found: boolean;
  dossier?: TeamMemberDossier;
  suggestedFollowUps: string[];
}
