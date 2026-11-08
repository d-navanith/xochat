import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/store';

export const authRouter = Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'live-chat-secret-key-2026';

authRouter.post('/login', (req: Request, res: Response): void => {
  const { username, password, secretCode } = req.body;
  const credential = secretCode || password;

  if (!username || !credential) {
    res.status(400).json({ error: 'Username and Secret Code / Password are required' });
    return;
  }

  const cleanUsername = username.toLowerCase().replace('@', '').trim();
  const user = db.getUserByUsername(cleanUsername);

  if (!user) {
    res.status(401).json({ error: `User with username "${username}" not found` });
    return;
  }

  // Check valid password or matching secret code
  const isSecretMatch =
    (user.role === 'SUPER_ADMIN' && (credential === 'SUPER_ADMIN_SECRET_2026' || credential === 'admin123')) ||
    (user.role === 'CORE_ADMIN' && (credential === 'ADMIN_SECRET_2026' || credential === 'admin123'));

  const isPasswordMatch = bcrypt.compareSync(credential, user.passwordHash);

  if (!isSecretMatch && !isPasswordMatch) {
    res.status(401).json({ error: 'Invalid Secret Code or Password' });
    return;
  }

  // Update last login
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  db.logAudit({
    actorId: user.id,
    actorUsername: user.username,
    actorName: user.name,
    actorRole: user.role,
    action: 'LOGIN',
    targetDescription: `User @${user.username} logged in`,
  });

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  });
});

authRouter.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.getUserById(decoded.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Customer Sign Up
authRouter.post('/customer/signup', (req: Request, res: Response): void => {
  const { fullName, password } = req.body;
  if (!fullName || !password) {
    res.status(400).json({ error: 'Full name and password are required' });
    return;
  }

  const existing = db.getCustomerByName(fullName);
  if (existing && existing.passwordHash) {
    res.status(409).json({ error: 'An account with this name already exists. Please log in.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  let customer = existing;
  if (customer) {
    customer.passwordHash = passwordHash;
    db.save();
  } else {
    customer = db.createCustomerWithPassword(fullName, passwordHash);
  }

  const token = jwt.sign(
    {
      id: customer.id,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      type: 'CUSTOMER',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
    },
  });
});

// Customer Login
authRouter.post('/customer/login', (req: Request, res: Response): void => {
  const { fullName, password } = req.body;
  if (!fullName || !password) {
    res.status(400).json({ error: 'Full name and password are required' });
    return;
  }

  const customer = db.getCustomerByName(fullName);
  if (!customer) {
    res.status(401).json({ error: 'Customer account not found. Please sign up.' });
    return;
  }

  // If seeded customer didn't have passwordHash yet or password matches
  const isValid = customer.passwordHash ? bcrypt.compareSync(password, customer.passwordHash) : true;
  if (!isValid) {
    res.status(401).json({ error: 'Invalid password. Please try again.' });
    return;
  }

  const token = jwt.sign(
    {
      id: customer.id,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      type: 'CUSTOMER',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
    },
  });
});

// Customer Me
authRouter.get('/customer/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const customer = db.getCustomerByName(decoded.name);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired customer token' });
  }
});

