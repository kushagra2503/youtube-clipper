import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const allowedOrigin = process.env.NODE_ENV === "production" 
  ? "https://quackquery.app" 
  : "http://localhost:3000";

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigin,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  isAdmin: boolean;
  isSudo: boolean;
  createdAt: Date;
  lastLogin?: Date;
  stripeCustomerId?: string;
  subscriptionId?: string;
  downloadToken?: string;
}

interface DownloadStats {
  totalDownloads: number;
  dailyDownloads: { [date: string]: number };
  planDistribution: { free: number; pro: number; enterprise: number };
}

interface AdminSettings {
  maintenance: boolean;
  downloadEnabled: boolean;
  maxFreeDownloads: number;
  announcements: string[];
}

const users: Map<string, User> = new Map();
const downloadStats: DownloadStats = {
  totalDownloads: 0,
  dailyDownloads: {},
  planDistribution: { free: 0, pro: 0, enterprise: 0 }
};

const adminSettings: AdminSettings = {
  maintenance: false,
  downloadEnabled: true,
  maxFreeDownloads: 3,
  announcements: []
};

// JWT middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  const user = users.get(req.user.id);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Sudo middleware
const requireSudo = (req: any, res: any, next: any) => {
  const user = users.get(req.user.id);
  if (!user || (!user.isSudo && !user.isAdmin)) {
    return res.status(403).json({ error: 'Sudo access required' });
  }
  next();
};

// Utility functions
const generateToken = (user: User) => {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

const updateDownloadStats = (plan: 'free' | 'pro' | 'enterprise') => {
  downloadStats.totalDownloads++;
  downloadStats.planDistribution[plan]++;
  
  const today = new Date().toISOString().split('T')[0];
  downloadStats.dailyDownloads[today] = (downloadStats.dailyDownloads[today] || 0) + 1;
};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      plan: 'free',
      isAdmin: false,
      isSudo: false,
      createdAt: new Date(),
    };

    users.set(userId, user);

    const token = generateToken(user);

    // Send welcome email
    await sendEmail(
      email,
      'Welcome to QuackQuery!',
      `
      <h1>Welcome to QuackQuery, ${name}!</h1>
      <p>Thank you for joining QuackQuery, the AI-powered interview assistant.</p>
      <p>You can now download the app and start using it for your interviews.</p>
      <a href="${allowedOrigin}/download" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download QuackQuery</a>
      `
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: user.isAdmin,
        isSudo: user.isSudo
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: user.isAdmin,
        isSudo: user.isSudo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = users.get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.isAdmin,
    isSudo: user.isSudo,
    lastLogin: user.lastLogin
  });
});

// Payment Routes
app.post('/api/payments/create-checkout', authenticateToken, async (req: any, res) => {
  try {
    const { planType } = req.body; // 'pro' or 'enterprise'
    const user = users.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prices = {
      pro: process.env.STRIPE_PRO_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
    };

    const priceId = prices[planType as keyof typeof prices];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${allowedOrigin}/download?success=true&plan=${planType}`,
      cancel_url: `${allowedOrigin}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planType
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.metadata.userId;
      const planType = session.metadata.planType;

      const user = users.get(userId);
      if (user) {
        user.plan = planType;
        user.subscriptionId = session.subscription;
        user.downloadToken = uuidv4(); // Generate download token

        // Send success email with download link
        await sendEmail(
          user.email,
          'QuackQuery Pro Activated!',
          `
          <h1>Welcome to QuackQuery ${planType.charAt(0).toUpperCase() + planType.slice(1)}!</h1>
          <p>Your subscription is now active. You can download the premium version of QuackQuery.</p>
          <a href="${allowedOrigin}/download?token=${user.downloadToken}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download QuackQuery Pro</a>
          <p>Your premium features include:</p>
          <ul>
            <li>Unlimited interview sessions</li>
            <li>Advanced AI responses</li>
            <li>Real-time assistance</li>
            <li>Priority support</li>
          </ul>
          `
        );
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook failed' });
  }
});

// Download Routes
app.get('/api/download/check', authenticateToken, (req: any, res) => {
  const user = users.get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!adminSettings.downloadEnabled && !user.isAdmin) {
    return res.status(503).json({ error: 'Downloads are currently disabled' });
  }

  const canDownload = user.plan !== 'free' || user.isAdmin || user.isSudo;
  
  res.json({
    canDownload,
    plan: user.plan,
    downloadToken: user.downloadToken,
    requiresPayment: !canDownload
  });
});

app.get('/api/download/:platform', authenticateToken, (req: any, res) => {
  const { platform } = req.params; // 'windows', 'mac', 'linux'
  const user = users.get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.plan === 'free' && !user.isAdmin && !user.isSudo) {
    return res.status(403).json({ error: 'Premium subscription required' });
  }

  if (!adminSettings.downloadEnabled && !user.isAdmin) {
    return res.status(503).json({ error: 'Downloads are currently disabled' });
  }

  // Update download stats
  updateDownloadStats(user.plan);

  // In production, these would be actual download URLs or file paths
  const downloadUrls = {
    windows: 'https://releases.quackquery.app/QuackQuery-Setup-1.0.0.exe',
    mac: 'https://releases.quackquery.app/QuackQuery-1.0.0.dmg',
    linux: 'https://releases.quackquery.app/QuackQuery-1.0.0.AppImage'
  };

  const downloadUrl = downloadUrls[platform as keyof typeof downloadUrls];
  if (!downloadUrl) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  // Log download
  console.log(`Download: ${user.email} (${user.plan}) downloaded ${platform} version`);

  res.json({ 
    downloadUrl,
    platform,
    version: '1.0.0',
    plan: user.plan
  });
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: any, res) => {
  const totalUsers = users.size;
  const planCounts = Array.from(users.values()).reduce((acc, user) => {
    acc[user.plan] = (acc[user.plan] || 0) + 1;
    return acc;
  }, {} as any);

  const recentUsers = Array.from(users.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  res.json({
    totalUsers,
    planCounts,
    downloadStats,
    recentUsers: recentUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }))
  });
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req: any, res) => {
  const userList = Array.from(users.values()).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    isAdmin: u.isAdmin,
    isSudo: u.isSudo,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin
  }));

  res.json({ users: userList });
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const { plan, isAdmin, isSudo } = req.body;

  const user = users.get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (plan) user.plan = plan;
  if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;
  if (typeof isSudo === 'boolean') user.isSudo = isSudo;

  res.json({ message: 'User updated successfully' });
});

app.get('/api/admin/settings', authenticateToken, requireAdmin, (req: any, res) => {
  res.json(adminSettings);
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, (req: any, res) => {
  const { maintenance, downloadEnabled, maxFreeDownloads, announcements } = req.body;

  if (typeof maintenance === 'boolean') adminSettings.maintenance = maintenance;
  if (typeof downloadEnabled === 'boolean') adminSettings.downloadEnabled = downloadEnabled;
  if (typeof maxFreeDownloads === 'number') adminSettings.maxFreeDownloads = maxFreeDownloads;
  if (Array.isArray(announcements)) adminSettings.announcements = announcements;

  res.json({ message: 'Settings updated successfully' });
});

// Sudo Routes
app.get('/api/sudo/logs', authenticateToken, requireSudo, (req: any, res) => {
  // In production, this would read from actual log files
  const mockLogs = [
    { timestamp: new Date(), level: 'INFO', message: 'User login successful', userId: req.user.id },
    { timestamp: new Date(), level: 'INFO', message: 'Download initiated', platform: 'windows' },
    { timestamp: new Date(), level: 'ERROR', message: 'Payment processing failed', error: 'Card declined' }
  ];

  res.json({ logs: mockLogs });
});

app.post('/api/sudo/broadcast', authenticateToken, requireSudo, async (req: any, res) => {
  const { subject, message, targetPlan } = req.body;

  try {
    const targetUsers = Array.from(users.values()).filter(user => 
      !targetPlan || user.plan === targetPlan
    );

    for (const user of targetUsers) {
      await sendEmail(user.email, subject, message);
    }

    res.json({ 
      message: 'Broadcast sent successfully', 
      recipientCount: targetUsers.length 
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// Public Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    maintenance: adminSettings.maintenance,
    downloadEnabled: adminSettings.downloadEnabled,
    announcements: adminSettings.announcements
  });
});

app.get('/api/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['5 interview sessions/month', 'Basic AI responses', 'Community support']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        features: ['Unlimited sessions', 'Advanced AI', 'Real-time assistance', 'Priority support']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        features: ['Everything in Pro', 'Team dashboard', 'Custom integrations', 'Dedicated support']
      }
    ]
  });
});

app.get("/", (req, res) => {
  res.json({ 
    message: "QuackQuery Backend API",
    version: "1.0.0",
    status: "active"
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`QuackQuery Backend running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS origin: ${allowedOrigin}`);
  
  // Create default admin user if none exists
  const adminExists = Array.from(users.values()).some(u => u.isAdmin);
  if (!adminExists) {
    const adminId = uuidv4();
    const defaultAdmin: User = {
      id: adminId,
      email: 'radhikayash2@gmail.com',
      password: bcrypt.hashSync('admin123', 10),
      name: 'Admin User',
      plan: 'enterprise',
      isAdmin: true,
      isSudo: true,
      createdAt: new Date(),
    };
    users.set(adminId, defaultAdmin);
          console.log('Default admin user created: radhikayash2@gmail.com / admin123');
  }
}); 