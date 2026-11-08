import { Router, Request, Response } from 'express';
import { db } from '../db/store';
import { lockManager } from '../services/lockManager';
import { Conversation, Message } from '../types';

export const conversationsRouter = Router();

conversationsRouter.get('/', (req: Request, res: Response): void => {
  const { tab = 'all', agentId, date = '10.28.2026' } = req.query;

  let allConvs = db.getConversations();

  // Filter by date if specified
  if (date) {
    allConvs = allConvs.filter((c) => c.dateStr === date);
  }

  const pendingConversations = allConvs.filter((c) => !c.hasReplied && c.status === 'PENDING');
  const repliedConversations = allConvs.filter((c) => c.hasReplied || c.status === 'REPLIED');
  const mineConversations = agentId
    ? allConvs.filter((c) => c.claimedByAgentId === agentId)
    : [];

  let filtered: Conversation[] = [];

  if (tab === 'all' || tab === 'pending') {
    // When in "All" view, only unanswered messages appear (replied messages are removed and moved to replied box!)
    filtered = pendingConversations;
  } else if (tab === 'replied') {
    // The "Replied Box"
    filtered = repliedConversations;
  } else if (tab === 'mine' && agentId) {
    // Handled by this agent
    filtered = mineConversations;
  } else {
    filtered = pendingConversations;
  }

  const activeLocks = lockManager.getAllActiveLocks();

  res.json({
    conversations: filtered,
    stats: {
      pendingCount: pendingConversations.length,
      repliedCount: repliedConversations.length,
      mineCount: mineConversations.length,
      totalCount: allConvs.length,
    },
    activeLocks,
  });
});

conversationsRouter.get('/:id', (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const conv = db.getConversationById(id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const lock = lockManager.getLock(conv.id);
  res.json({ conversation: conv, lock });
});

// Customer portal endpoint: get conversation history by customer name
conversationsRouter.get('/customer/:name', (req: Request, res: Response): void => {
  const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  if (!name) {
    res.json({ conversations: [], activeConversation: null, isWaitingForReply: false });
    return;
  }
  const cleanName = name.toLowerCase().trim();
  const allCust = db.getConversations().filter(
    (c) =>
      c.customerName.toLowerCase().trim().includes(cleanName) ||
      cleanName.includes(c.customerName.toLowerCase().trim())
  );

  // Find pending conversation if any
  const pendingConv = allCust.find((c) => !c.hasReplied && c.status === 'PENDING');
  const activeConversation = pendingConv || (allCust.length > 0 ? allCust[0] : null);
  const isWaitingForReply = !!pendingConv;

  res.json({
    conversations: allCust,
    activeConversation,
    isWaitingForReply,
  });
});

// Simulate new incoming customer message (e.g. from live widget or scraping lead generator)
conversationsRouter.post('/simulate', (req: Request, res: Response): void => {
  const { customerName, text, email } = req.body;

  const names = [
    'Eleanor Vance',
    'Jordan Belfort',
    'Sophia Loren',
    'Liam Neeson',
    'Zoe Saldana',
    'Lucas Scott',
    'Amelia Earhart',
  ];
  const sampleQueries = [
    'Hello, can you help verify why my order #9942 is held up?',
    'Good morning, I have a doubt regarding your refund policy.',
    'Is there an agent available to discuss enterprise volume rates?',
    'Hi! I tried making a payment but got an authorization error.',
    'Can someone please update the destination address for my cargo?',
  ];

  const name = customerName || names[Math.floor(Math.random() * names.length)];
  const query = text || sampleQueries[Math.floor(Math.random() * sampleQueries.length)];

  const custId = `cust_${Date.now()}`;
  const convId = `conv_${Date.now()}`;
  const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}`;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
  const timeFormatted = `${hours % 12 || 12}.${minutes} ${ampm}`;

  const message: Message = {
    id: `msg_${Date.now()}`,
    conversationId: convId,
    senderType: 'CUSTOMER',
    senderName: name,
    senderAvatar: avatarUrl,
    text: query,
    timestamp: now.toISOString(),
    timeFormatted,
    dateFormatted: '28th OCT 2026',
  };

  const newConv: Conversation = {
    id: convId,
    customerId: custId,
    customerName: name,
    customerAvatar: avatarUrl,
    status: 'PENDING',
    hasReplied: false,
    replyCount: 0,
    isUnansweredGreen: true, // GREEN DOT ACTIVE!
    lastMessageText: query,
    lastMessageTime: timeFormatted,
    dateStr: '10.28.2026',
    dateFormatted: '28th OCT 2026',
    messages: [message],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.createConversation(newConv);

  res.status(201).json({
    conversation: newConv,
    message: 'Simulated customer inquiry created',
  });
});
