import { db } from '../db/store';
import { AgentMetrics } from '../types';

export class MetricsService {
  public getTeamMetrics(): AgentMetrics[] {
    const users = db.getUsers().filter((u) => u.role === 'AGENT' || u.role === 'CORE_ADMIN');
    const conversations = db.getConversations();

    const metricsMap = new Map<string, AgentMetrics>();

    users.forEach((u) => {
      metricsMap.set(u.id, {
        userId: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        avatarUrl: u.avatarUrl,
        messagesSentCount: 0,
        conversationsHandledCount: 0,
        conversationsResolvedCount: 0,
        averageResponseTimeSeconds: 0,
        recentMessages: [],
      });
    });

    const totalResponseTimes = new Map<string, number[]>();

    conversations.forEach((conv) => {
      // Check if claimed / replied
      if (conv.claimedByAgentId && metricsMap.has(conv.claimedByAgentId)) {
        const m = metricsMap.get(conv.claimedByAgentId)!;
        m.conversationsHandledCount++;
        if (conv.hasReplied || conv.status === 'REPLIED' || conv.status === 'RESOLVED') {
          m.conversationsResolvedCount++;
        }
      }

      // Check messages sent by agents
      conv.messages.forEach((msg) => {
        if (msg.senderType === 'AGENT' && msg.senderId && metricsMap.has(msg.senderId)) {
          const m = metricsMap.get(msg.senderId)!;
          m.messagesSentCount++;

          const createdMs = new Date(conv.createdAt).getTime();
          const repliedMs = new Date(msg.timestamp).getTime();
          const diffSec = Math.max(1, Math.round((repliedMs - createdMs) / 1000));

          if (!totalResponseTimes.has(msg.senderId)) {
            totalResponseTimes.set(msg.senderId, []);
          }
          totalResponseTimes.get(msg.senderId)!.push(diffSec);

          m.recentMessages.push({
            messageId: msg.id,
            conversationId: conv.id,
            customerName: conv.customerName,
            text: msg.text,
            timestamp: msg.timestamp,
            responseTimeSeconds: diffSec,
          });
        }
      });
    });

    for (const [userId, m] of metricsMap.entries()) {
      const times = totalResponseTimes.get(userId) || [];
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        m.averageResponseTimeSeconds = Math.round(sum / times.length);
      }
      m.recentMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return Array.from(metricsMap.values());
  }

  public getSystemSummary() {
    const conversations = db.getConversations();
    const pendingCount = conversations.filter((c) => !c.hasReplied && c.status === 'PENDING').length;
    const repliedCount = conversations.filter((c) => c.hasReplied).length;
    const resolvedCount = conversations.filter((c) => c.status === 'RESOLVED').length;

    let totalAgentMessages = 0;
    let totalCustomerMessages = 0;

    conversations.forEach((c) => {
      c.messages.forEach((m) => {
        if (m.senderType === 'AGENT') totalAgentMessages++;
        else totalCustomerMessages++;
      });
    });

    return {
      pendingCount,
      repliedCount,
      resolvedCount,
      totalConversations: conversations.length,
      totalAgentMessages,
      totalCustomerMessages,
      totalTeamMembers: db.getUsers().length,
    };
  }
}

export const metricsService = new MetricsService();
