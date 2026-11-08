import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/store';
import { JWT_SECRET } from './auth';
import { metricsService } from '../services/metricsService';
import { UserRole } from '../types';

export const adminRouter = Router();

// Middleware to verify JWT
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware: Core Admin or Super Admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'CORE_ADMIN')) {
    res.status(403).json({ error: 'Access denied: Admin privileges required' });
    return;
  }
  next();
};

// List all team members
adminRouter.get('/users', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const users = db.getUsers().map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));
  res.json({ users });
});

// Create new team member (Super Admin or Core Admin)
adminRouter.post('/users', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const actor = (req as any).user;
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    res.status(400).json({ error: 'Username, password, and full name are required' });
    return;
  }

  // Core Admin cannot create Super Admin
  const targetRole: UserRole = role || 'AGENT';
  if (actor.role === 'CORE_ADMIN' && targetRole === 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Core Admins cannot provision Super Admins' });
    return;
  }

  // Check unique username
  const existing = db.getUserByUsername(username);
  if (existing) {
    res.status(409).json({ error: `Username @${username} is already taken` });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

  const newUser = db.createUser({
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    username: username.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    role: targetRole,
    avatarUrl,
    createdById: actor.id,
    createdAt: new Date().toISOString(),
  });

  // Log Audit trail
  db.logAudit({
    actorId: actor.id,
    actorUsername: actor.username,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE_USER',
    targetId: newUser.id,
    targetDescription: `Provisioned ${targetRole} account @${newUser.username} (${newUser.name})`,
    details: { assignedRole: targetRole, assignedUsername: newUser.username },
  });

  res.status(201).json({
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
    },
  });
});

// Get team metrics and message counts breakdown
adminRouter.get('/metrics', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const teamMetrics = metricsService.getTeamMetrics();
  const summary = metricsService.getSystemSummary();
  res.json({ teamMetrics, summary });
});

// Scraping & Agent Activity Inspector (for both Super Admin and Core Admin)
// "Admin is doing scrapping for get details from team members because admins wants to know what they are doing and if any dought happen they can identify easily through the system who do that, what he do like wise."
adminRouter.get('/scrape-activity', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { agentUsername, customerQuery, action } = req.query;

  let logs = db.getAuditLogs();

  if (agentUsername) {
    const q = (agentUsername as string).toLowerCase().replace('@', '').trim();
    logs = logs.filter((l) => l.actorUsername.toLowerCase().includes(q));
  }

  if (customerQuery) {
    const q = (customerQuery as string).toLowerCase().trim();
    logs = logs.filter(
      (l) =>
        (l.customerName && l.customerName.toLowerCase().includes(q)) ||
        (l.targetDescription && l.targetDescription.toLowerCase().includes(q)) ||
        (l.replyText && l.replyText.toLowerCase().includes(q))
    );
  }

  if (action) {
    logs = logs.filter((l) => l.action === action);
  }

  res.json({
    totalEntries: logs.length,
    activityStream: logs,
  });
});

// Full Audit Logs (Super Admin & Core Admin)
adminRouter.get('/audit-logs', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const logs = db.getAuditLogs();
  res.json({ logs });
});
