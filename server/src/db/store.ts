import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Conversation, AuditLog, Customer, Message } from '../types';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  conversations: Conversation[];
  auditLogs: AuditLog[];
}

export class JsonStore {
  private data: DatabaseSchema = {
    users: [],
    customers: [],
    conversations: [],
    auditLogs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Force reseed on schema changes if needed or load
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure new fields exist on existing data
        this.data.conversations = this.data.conversations.map((c) => ({
          ...c,
          hasReplied: c.hasReplied ?? (c.status === 'CLAIMED' || c.status === 'RESOLVED'),
          replyCount: c.replyCount ?? (c.messages.filter((m) => m.senderType === 'AGENT').length),
          isUnansweredGreen: c.isUnansweredGreen ?? (c.status === 'PENDING'),
        }));
        return;
      } catch (err) {
        console.error('Error loading existing db.json, reseeding default data...', err);
      }
    }

    this.seedDefaultData();
    this.save();
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  private seedDefaultData() {
    const salt = bcrypt.genSaltSync(10);
    const hashSuper = bcrypt.hashSync('admin123', salt);
    const hashCore = bcrypt.hashSync('admin123', salt);
    const hashMurdock = bcrypt.hashSync('murdock123', salt);
    const hashLisa = bcrypt.hashSync('lisa123', salt);
    const hashJohn = bcrypt.hashSync('john123', salt);

    const users: User[] = [
      {
        id: 'usr_super_1',
        username: 'superadmin',
        name: 'Alexander Vance',
        passwordHash: hashSuper,
        role: 'SUPER_ADMIN',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=superadmin',
        createdAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'usr_core_1',
        username: 'coreadmin',
        name: 'Elena Rostova',
        passwordHash: hashCore,
        role: 'CORE_ADMIN',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=coreadmin',
        createdAt: '2026-10-05T08:00:00.000Z',
      },
      {
        id: 'usr_murdock_1',
        username: 'murdock',
        name: 'H.M. Murdock',
        passwordHash: hashMurdock,
        role: 'AGENT',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=murdock&accessories[]=eyepatch&hairColor=auburn',
        createdAt: '2026-10-10T08:00:00.000Z',
      },
      {
        id: 'usr_lisa_1',
        username: 'lisa',
        name: 'Lisa Ray',
        passwordHash: hashLisa,
        role: 'AGENT',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa&hairColor=black',
        createdAt: '2026-10-12T08:00:00.000Z',
      },
      {
        id: 'usr_john_1',
        username: 'john',
        name: 'John Miller',
        passwordHash: hashJohn,
        role: 'AGENT',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john&hairColor=blonde',
        createdAt: '2026-10-15T08:00:00.000Z',
      },
    ];

    // Seed 11 Pending Conversations matching User UI Mockups (UNANSWERED -> with GREEN dot)
    const pendingCustomers = [
      { name: 'Theodore T.C. Calvin', query: 'Hello ? Interested in this loads?', time: '10.28 A.M.' },
      { name: 'Dori Doreau', query: 'Lorem ipsum varius iaculis at interdum scelerisque.', time: '10.28 A.M.' },
      { name: 'Gina Calabrese', query: 'Figma ipsum component prototype resizing create flatten.', time: '10.28 A.M.' },
      { name: 'Jesse Katsopolis', query: 'Crypto ipsum audius serum chainlink ICON telcoin.', time: '10.28 A.M.' },
      { name: 'Jazz Jeff', query: 'Office ipsum you must be', time: '10.28 A.M.' },
      { name: 'Vivian Banks', query: 'Hipster ipsum try-hard portland ipsum chicken hell.', time: '10.28 A.M.' },
      { name: 'Arthur Pendelton', query: 'Can you provide the shipping manifest for delivery #882?', time: '10.25 A.M.' },
      { name: 'Carlos Gomez', query: 'Is this available for expedited freight pickup today?', time: '10.22 A.M.' },
      { name: 'Samantha Vance', query: 'Need a revised rate confirmation on load ref 4091.', time: '10.15 A.M.' },
      { name: 'Marcus Sterling', query: 'What are the customs clearance requirements for this lane?', time: '10.10 A.M.' },
      { name: 'Chloe Bennett', query: 'Payment processed but status still showing as pending.', time: '10.05 A.M.' },
    ];

    const customers: Customer[] = [];
    const conversations: Conversation[] = [];

    pendingCustomers.forEach((pc, idx) => {
      const custId = `cust_pending_${idx + 1}`;
      const convId = `conv_pending_${idx + 1}`;
      const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(pc.name)}`;

      customers.push({
        id: custId,
        name: pc.name,
        passwordHash: hashSuper, // Allows login with password123 or admin123
        avatarUrl,
        channel: 'customer_portal_3002',
        createdAt: '2026-10-28T04:45:00.000Z',
      });

      const message: Message = {
        id: `msg_cust_${idx + 1}`,
        conversationId: convId,
        senderType: 'CUSTOMER',
        senderName: pc.name,
        senderAvatar: avatarUrl,
        text: pc.query,
        timestamp: '2026-10-28T04:58:00.000Z',
        timeFormatted: pc.time,
        dateFormatted: '28th OCT 2026',
      };

      conversations.push({
        id: convId,
        customerId: custId,
        customerName: pc.name,
        customerAvatar: avatarUrl,
        status: 'PENDING',
        hasReplied: false,
        replyCount: 0,
        isUnansweredGreen: true, // GREEN DOT ACTIVE!
        lastMessageText: pc.query,
        lastMessageTime: pc.time,
        dateStr: '10.28.2026',
        dateFormatted: '28th OCT 2026',
        messages: [message],
        createdAt: '2026-10-28T04:58:00.000Z',
        updatedAt: '2026-10-28T04:58:00.000Z',
      });
    });

    // Seed 16 conversations in the "REPLIED BOX" (Already replied, green dot removed!)
    for (let i = 1; i <= 16; i++) {
      const custId = `cust_replied_${i}`;
      const convId = `conv_replied_${i}`;
      const custName = `Client Partner #${100 + i}`;
      const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(custName)}`;

      customers.push({
        id: custId,
        name: custName,
        avatarUrl,
        channel: 'customer_portal_3002',
        createdAt: '2026-10-28T03:00:00.000Z',
      });

      const custMsg: Message = {
        id: `msg_replied_c_${i}`,
        conversationId: convId,
        senderType: 'CUSTOMER',
        senderName: custName,
        senderAvatar: avatarUrl,
        text: `Inquiry regarding contract shipment delivery #${9900 + i}.`,
        timestamp: '2026-10-28T03:10:00.000Z',
        timeFormatted: '09.15 A.M.',
        dateFormatted: '28th OCT 2026',
      };

      const agentReply: Message = {
        id: `msg_replied_a_${i}`,
        conversationId: convId,
        senderType: 'AGENT',
        senderId: 'usr_murdock_1',
        senderName: 'H.M. Murdock',
        senderUsername: 'murdock',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=murdock&accessories[]=eyepatch&hairColor=auburn',
        text: `Hello! I have reviewed delivery #${9900 + i}. Everything is on schedule, I am tracking this for you.`,
        timestamp: '2026-10-28T03:12:00.000Z',
        timeFormatted: '09.18 A.M.',
        dateFormatted: '28th OCT 2026',
      };

      conversations.push({
        id: convId,
        customerId: custId,
        customerName: custName,
        customerAvatar: avatarUrl,
        status: 'REPLIED',
        hasReplied: true,
        replyCount: 1, // Only 1 reply!
        isUnansweredGreen: false, // GREEN DOT REMOVED!
        claimedByAgentId: 'usr_murdock_1',
        claimedByUsername: 'murdock',
        claimedByName: 'H.M. Murdock',
        claimedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=murdock&accessories[]=eyepatch&hairColor=auburn',
        claimedAt: '2026-10-28T03:11:00.000Z',
        lastMessageText: agentReply.text,
        lastMessageTime: agentReply.timeFormatted,
        dateStr: '10.28.2026',
        dateFormatted: '28th OCT 2026',
        messages: [custMsg, agentReply],
        createdAt: '2026-10-28T03:10:00.000Z',
        updatedAt: '2026-10-28T03:12:00.000Z',
        closedAt: '2026-10-28T03:12:00.000Z',
      });
    }

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_init_1',
        actorId: 'usr_super_1',
        actorUsername: 'superadmin',
        actorName: 'Alexander Vance',
        actorRole: 'SUPER_ADMIN',
        action: 'CREATE_USER',
        targetId: 'usr_murdock_1',
        targetDescription: 'Provisioned Agent account @murdock',
        timestamp: '2026-10-10T08:00:00.000Z',
      },
      {
        id: 'aud_scrape_1',
        actorId: 'usr_murdock_1',
        actorUsername: 'murdock',
        actorName: 'H.M. Murdock',
        actorRole: 'AGENT',
        action: 'SEND_REPLY',
        targetId: 'conv_replied_1',
        targetDescription: 'Replied to Client Partner #101',
        customerName: 'Client Partner #101',
        replyText: 'Hello! I have reviewed delivery #9901. Everything is on schedule...',
        responseTimeSeconds: 120,
        ipAddress: '192.168.1.105',
        timestamp: '2026-10-28T03:12:00.000Z',
      },
    ];

    this.data = { users, customers, conversations, auditLogs };
  }

  // --- User Operations ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
  }

  // --- Customer Operations ---
  public getCustomerByName(name: string): Customer | undefined {
    const q = name.toLowerCase().trim();
    return this.data.customers.find((c) => {
      const cName = c.name.toLowerCase().trim();
      return cName === q || cName.startsWith(q) || q.startsWith(cName);
    });
  }

  public createCustomerWithPassword(name: string, passwordHash: string): Customer {
    const cust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      passwordHash,
      channel: 'customer_portal_3002',
      avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name.trim())}`,
      createdAt: new Date().toISOString(),
    };
    this.data.customers.push(cust);
    this.save();
    return cust;
  }

  public getOrCreateCustomer(name: string, email?: string): Customer {
    let customer = this.data.customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!customer) {
      customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name,
        email,
        channel: 'customer_portal_3002',
        avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString(),
      };
      this.data.customers.push(customer);
      this.save();
    }
    return customer;
  }

  // --- Conversation Operations ---
  public getConversations(): Conversation[] {
    return this.data.conversations;
  }

  public getConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  public getConversationByCustomerId(customerId: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.customerId === customerId);
  }

  public createConversation(conv: Conversation): Conversation {
    this.data.conversations.unshift(conv);
    this.save();
    return conv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const idx = this.data.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.conversations[idx] = { ...this.data.conversations[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.conversations[idx];
  }

  public addMessageToConversation(conversationId: string, message: Message): Conversation | null {
    const conv = this.getConversationById(conversationId);
    if (!conv) return null;
    conv.messages.push(message);
    conv.lastMessageText = message.text;
    conv.lastMessageTime = message.timeFormatted;
    conv.updatedAt = new Date().toISOString();
    this.save();
    return conv;
  }

  // --- Audit Log Operations ---
  public resetSeed() {
    this.seedDefaultData();
    this.save();
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(entry);
    this.save();
    return entry;
  }
}

export const db = new JsonStore();
