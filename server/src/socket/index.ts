import { Server, Socket } from 'socket.io';
import { lockManager } from '../services/lockManager';
import { db } from '../db/store';
import { Message, Conversation } from '../types';

interface ConnectedAgent {
  socketId: string;
  agentId: string;
  username: string;
  name: string;
  avatarUrl: string;
}

export function setupSocketServer(io: Server) {
  const connectedAgents = new Map<string, ConnectedAgent>();

  // Helper to broadcast current global stats
  const broadcastStats = () => {
    const all = db.getConversations();
    const pendingCount = all.filter((c) => !c.hasReplied && c.status === 'PENDING').length;
    const repliedCount = all.filter((c) => c.hasReplied).length;
    io.emit('stats:updated', {
      pendingCount,
      repliedCount,
      totalCount: all.length,
    });
  };

  io.on('connection', (socket: Socket) => {
    // Agent registers their presence
    socket.on('agent:register', (data: { agentId: string; username: string; name: string; avatarUrl: string }) => {
      connectedAgents.set(socket.id, {
        socketId: socket.id,
        ...data,
      });

      // Send initial active locks map to newly connected agent
      socket.emit('locks:sync', lockManager.getAllActiveLocks());
      broadcastStats();
    });

    // Customer joins their chat room (from localhost:3002)
    socket.on('customer:register', (data: { customerName: string; customerId?: string }) => {
      const room = `customer:${data.customerName.toLowerCase().trim()}`;
      socket.join(room);
      console.log(`[Socket] Customer "${data.customerName}" joined room ${room}`);

      // Check if this customer already has an unanswered pending inquiry
      const allCust = db.getConversations().filter(
        (c) =>
          c.customerName.toLowerCase().trim().includes(data.customerName.toLowerCase().trim()) ||
          data.customerName.toLowerCase().trim().includes(c.customerName.toLowerCase().trim())
      );
      const pendingConv = allCust.find((c) => !c.hasReplied && c.status === 'PENDING');
      const isWaitingForReply = !!pendingConv;

      socket.emit('customer:sync_status', {
        isWaitingForReply,
        conversation: pendingConv || (allCust.length > 0 ? allCust[0] : null),
        messages: pendingConv ? pendingConv.messages : allCust.length > 0 ? allCust[0].messages : [],
      });
    });

    // Customer sends message from localhost:3002
    socket.on('customer:send_message', (data: { customerName: string; text: string; email?: string }) => {
      if (!data.customerName || !data.text || !data.text.trim()) return;

      const customer = db.getOrCreateCustomer(data.customerName, data.email);

      // USER RULE: "customer can't message repeatedly, once he send an one message he should wait until team members will reply . thats the meaning of this ."
      const allCust = db.getConversations().filter(
        (c) =>
          c.customerId === customer.id ||
          c.customerName.toLowerCase().trim().includes(customer.name.toLowerCase().trim()) ||
          customer.name.toLowerCase().trim().includes(c.customerName.toLowerCase().trim())
      );
      const existingPending = allCust.find((c) => !c.hasReplied && c.status === 'PENDING');

      if (existingPending) {
        socket.emit('customer:message_blocked', {
          conversationId: existingPending.id,
          message: 'Wait for a minute our team will contact you soon...',
          isWaitingForReply: true,
        });
        return;
      }

      const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
      const timeFormatted = `${hours % 12 || 12}.${minutes} ${ampm}`;

      const message: Message = {
        id: `msg_${Date.now()}`,
        conversationId: convId,
        senderType: 'CUSTOMER',
        senderName: customer.name,
        senderAvatar: customer.avatarUrl,
        text: data.text.trim(),
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted: '28th OCT 2026',
      };

      const newConv: Conversation = {
        id: convId,
        customerId: customer.id,
        customerName: customer.name,
        customerAvatar: customer.avatarUrl,
        status: 'PENDING',
        hasReplied: false,
        replyCount: 0,
        isUnansweredGreen: true, // GREEN DOT ACTIVE!
        lastMessageText: data.text.trim(),
        lastMessageTime: timeFormatted,
        dateStr: '10.28.2026',
        dateFormatted: '28th OCT 2026',
        messages: [message],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      db.createConversation(newConv);

      // Broadcast to all team members
      io.emit('conversation:new_pending', { conversation: newConv });
      broadcastStats();

      // Notify customer socket: now locked waiting for reply!
      socket.emit('customer:message_sent', {
        conversation: newConv,
        message,
        isWaitingForReply: true,
      });
    });

    // Attempt to acquire collision lock when clicking 'Reply'
    socket.on('claim:lock', (data: { conversationId: string }) => {
      const agent = connectedAgents.get(socket.id);
      if (!agent) {
        socket.emit('claim:error', { error: 'Agent must be logged in to claim conversations' });
        return;
      }

      const conv = db.getConversationById(data.conversationId);
      if (!conv) {
        socket.emit('claim:error', { error: 'Conversation not found' });
        return;
      }

      // Check if already replied
      if (conv.hasReplied || conv.replyCount >= 1) {
        socket.emit('claim:failed', {
          conversationId: data.conversationId,
          message: 'This inquiry has already been answered and moved to the Replied Box.',
        });
        return;
      }

      const result = lockManager.acquireLock(
        data.conversationId,
        agent.agentId,
        agent.username,
        agent.name,
        agent.avatarUrl
      );

      if (result.success) {
        socket.emit('claim:success', {
          conversationId: data.conversationId,
          lock: result.lock,
        });

        // Broadcast lock to all other agents so they see "@murdock is replying"
        io.emit('conversation:locked', {
          conversationId: data.conversationId,
          lock: result.lock,
        });

        db.logAudit({
          actorId: agent.agentId,
          actorUsername: agent.username,
          actorName: agent.name,
          actorRole: 'AGENT',
          action: 'CLAIM_CONVERSATION',
          targetId: data.conversationId,
          customerName: conv.customerName,
          targetDescription: `@${agent.username} claimed customer ${conv.customerName}`,
          ipAddress: socket.handshake.address,
        });
      } else {
        socket.emit('claim:failed', {
          conversationId: data.conversationId,
          message: result.message,
          lock: result.lock,
        });
      }
    });

    // Release lock (e.g. agent cancelled reply)
    socket.on('claim:release', (data: { conversationId: string }) => {
      const agent = connectedAgents.get(socket.id);
      if (!agent) return;

      const released = lockManager.releaseLock(data.conversationId, agent.agentId);
      if (released) {
        io.emit('conversation:unlocked', { conversationId: data.conversationId });
      }
    });

    // Agent submits a reply (RULE: Only one reply can be sent!)
    socket.on('message:send', (data: { conversationId: string; text: string }) => {
      const agent = connectedAgents.get(socket.id);
      if (!agent) {
        socket.emit('message:error', { error: 'Agent not authenticated' });
        return;
      }

      if (!data.text || !data.text.trim()) {
        socket.emit('message:error', { error: 'Message cannot be empty' });
        return;
      }

      const conv = db.getConversationById(data.conversationId);
      if (!conv) {
        socket.emit('message:error', { error: 'Conversation not found' });
        return;
      }

      // STRICT RULE: Only ONE reply can be sent!
      if (conv.hasReplied || conv.replyCount >= 1) {
        socket.emit('message:error', {
          error: 'Only one reply is permitted per customer inquiry. This chat has already been answered and closed.',
        });
        return;
      }

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
      const timeFormatted = `${hours % 12 || 12}.${minutes} ${ampm}`;

      const replyMsg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        conversationId: conv.id,
        senderType: 'AGENT',
        senderId: agent.agentId,
        senderUsername: agent.username,
        senderName: agent.name,
        senderAvatar: agent.avatarUrl,
        text: data.text.trim(),
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted: '28th OCT 2026',
      };

      // Calculate response time in seconds
      const createdAtMs = new Date(conv.createdAt).getTime();
      const responseTimeSeconds = Math.max(1, Math.round((now.getTime() - createdAtMs) / 1000));

      // Add message
      db.addMessageToConversation(conv.id, replyMsg);

      // UPDATED BUSINESS RULES:
      // 1. remove green color mark (isUnansweredGreen = false)
      // 2. chat is closed and goes to replied box (status = 'REPLIED', hasReplied = true, replyCount = 1)
      const updatedConv = db.updateConversation(conv.id, {
        status: 'REPLIED',
        hasReplied: true,
        replyCount: 1,
        isUnansweredGreen: false, // GREEN COLOR MARK REMOVED!
        claimedByAgentId: agent.agentId,
        claimedByUsername: agent.username,
        claimedByName: agent.name,
        claimedByAvatar: agent.avatarUrl,
        claimedAt: now.toISOString(),
        closedAt: now.toISOString(),
      });

      // Release active drafting lock
      lockManager.releaseLock(conv.id, agent.agentId, true);

      // Log detailed audit for Admins (Admin Scraping & Activity tracking)
      db.logAudit({
        actorId: agent.agentId,
        actorUsername: agent.username,
        actorName: agent.name,
        actorRole: 'AGENT',
        action: 'SEND_REPLY',
        targetId: conv.id,
        customerName: conv.customerName,
        replyText: data.text.trim(),
        responseTimeSeconds,
        targetDescription: `@${agent.username} answered ${conv.customerName}: "${data.text.trim()}" (${responseTimeSeconds}s response time)`,
        details: { text: data.text.trim(), customerId: conv.customerId, responseTimeSeconds },
        ipAddress: socket.handshake.address,
      });

      // Broadcast events
      // 1. Tell team members this conversation has been replied and moves out of pending
      io.emit('conversation:replied_and_closed', {
        conversationId: conv.id,
        conversation: updatedConv,
      });
      io.emit('conversation:updated', { conversation: updatedConv });
      io.emit('conversation:unlocked', { conversationId: conv.id });
      broadcastStats();

      // 2. Deliver real-time message to customer portal room (localhost:3002)
      const customerRoom = `customer:${conv.customerName.toLowerCase().trim()}`;
      io.to(customerRoom).emit('customer:reply_received', {
        conversationId: conv.id,
        reply: replyMsg,
        conversation: updatedConv,
        isWaitingForReply: false, // Team member replied! Customer can now interact again
      });

      socket.emit('message:sent_success', { conversationId: conv.id });
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const agent = connectedAgents.get(socket.id);
      if (agent) {
        const releasedLocks = lockManager.releaseAllByAgent(agent.agentId);
        releasedLocks.forEach((convId) => {
          io.emit('conversation:unlocked', { conversationId: convId });
        });
        connectedAgents.delete(socket.id);
      }
    });
  });

  // Background reaper: check every 5 seconds for expired locks
  setInterval(() => {
    const expired = lockManager.purgeExpired();
    if (expired.length > 0) {
      expired.forEach((convId) => {
        io.emit('conversation:unlocked', { conversationId: convId });
      });
    }
  }, 5000);
}
