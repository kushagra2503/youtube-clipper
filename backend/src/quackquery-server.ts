import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// DodoPayments configuration
const dodoConfig = {
  apiKey: process.env.DODO_API_KEY || '',
  environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.dodopayments.com' 
    : 'https://api-sandbox.dodopayments.com'
};

// Email configuration (only if SMTP settings are provided)
const emailTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

const allowedOrigin = process.env.NODE_ENV === "production" 
  ? "https://quackquery.app" 
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      allowedOrigin,
      'file://', // Allow Electron app requests
      'app://', // Allow Electron app requests
    ];
    
    // Allow requests with no origin (like from Electron)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
  lastLogout?: Date;
  dodoCustomerId?: string;
  paymentId?: string;
  downloadToken?: string;
  purchaseDate?: Date;
  lifetimeAccess: boolean;
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

  const jwtSecret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'default-secret-key';
  jwt.verify(token, jwtSecret, (err: any, user: any) => {
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
  const jwtSecret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'default-secret-key';
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    jwtSecret,
    { expiresIn: '30d' }
  );
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html,
      });
    } else {
      console.log('Email would be sent:', { to, subject, html });
    }
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// DodoPayments helper functions
const createDodoCheckout = async (planType: string, user: any) => {
  const prices = {
    pro: { amount: 420, currency: 'USD' }, // $4.20 one-time
    enterprise: { amount: 0, currency: 'USD' } // Contact for pricing
  };

  const planPrice = prices[planType as keyof typeof prices];
  if (!planPrice) {
    throw new Error('Invalid plan type');
  }

  // In a real implementation, you would call DodoPayments API for one-time payment
  // For now, we'll simulate the checkout URL
  const checkoutId = uuidv4();
  const checkoutUrl = `${dodoConfig.baseURL}/checkout/${checkoutId}?customer=${user.id}&plan=${planType}&amount=${planPrice.amount}&type=one_time`;
  
  return {
    checkoutUrl,
    checkoutId,
    amount: planPrice.amount,
    currency: planPrice.currency
  };
};

const handleDodoWebhook = async (payload: any) => {
  // Handle DodoPayments webhook events for one-time payments
  const { event_type, data } = payload;
  
  if (event_type === 'payment.completed' || event_type === 'payment.succeeded') {
    const { customer_id, payment_id, metadata } = data;
    const userId = metadata?.userId;
    const planType = metadata?.planType;
    
    if (userId && planType) {
      const user = users.get(userId);
      if (user) {
        user.plan = planType;
        user.paymentId = payment_id;
        user.dodoCustomerId = customer_id;
        user.downloadToken = uuidv4();
        user.purchaseDate = new Date();
        user.lifetimeAccess = true;
        
        // Send success email
        await sendEmail(
          user.email,
          'QuackQuery Pro - Lifetime Access Activated!',
          `
          <h1>Welcome to QuackQuery ${planType.charAt(0).toUpperCase() + planType.slice(1)}!</h1>
          <p>Your one-time purchase is complete! You now have lifetime access to QuackQuery Pro.</p>
          <a href="${allowedOrigin}/download?token=${user.downloadToken}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download QuackQuery Pro</a>
          <p>Your lifetime premium features include:</p>
          <ul>
            <li>Unlimited interview sessions forever</li>
            <li>Advanced AI responses</li>
            <li>Real-time assistance</li>
            <li>Priority support</li>
            <li>All future updates included</li>
          </ul>
          <p><strong>No recurring charges - this is a one-time purchase!</strong></p>
          `
        );
        
        return { success: true, user: user.id };
      }
    }
  }
  
  if (event_type === 'payment.failed') {
    const { metadata } = data;
    const userId = metadata?.userId;
    
    if (userId) {
      const user = users.get(userId);
      if (user) {
        // Send failure email
        await sendEmail(
          user.email,
          'QuackQuery Payment Failed',
          `
          <h1>Payment Processing Failed</h1>
          <p>We were unable to process your payment for QuackQuery Pro.</p>
          <p>Please try again or contact support if you continue to experience issues.</p>
          <a href="${allowedOrigin}/pricing" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Try Again</a>
          `
        );
      }
    }
  }
  
  return { success: false, error: 'Event not handled' };
};

const updateDownloadStats = (plan: 'free' | 'pro' | 'enterprise') => {
  const today = new Date().toISOString().split('T')[0];
  
  downloadStats.totalDownloads++;
  downloadStats.dailyDownloads[today] = (downloadStats.dailyDownloads[today] || 0) + 1;
  
  if (plan === 'free') downloadStats.planDistribution.free++;
  else if (plan === 'pro') downloadStats.planDistribution.pro++;
  else if (plan === 'enterprise') downloadStats.planDistribution.enterprise++;
};

// Function to check if user has premium access (sudo or paid)
const checkUserPremiumStatus = async (email: string): Promise<{ isPremium: boolean; isSudo: boolean; isAdmin: boolean }> => {
  try {
    // Call the frontend's internal API to check user status
    const response = await fetch(`${allowedOrigin}/api/internal/user-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      isPremium: result.isPremium || false,
      isSudo: result.isSudoUser || false,
      isAdmin: result.isAdmin || false
    };
  } catch (error) {
    console.error('Error checking user premium status:', error);
    // Fallback: only admin gets access if API fails
    const isAdmin = email === 'radhikayash2@gmail.com';
    return {
      isPremium: isAdmin,
      isSudo: false,
      isAdmin
    };
  }
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
      lifetimeAccess: false,
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

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req: any, res) => {
  try {
    const user = users.get(req.user.id);
    if (user) {
      user.lastLogout = new Date();
      console.log(`User ${user.email} logged out at ${user.lastLogout}`);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Authentication status check for Electron app (no token required)
app.get('/api/auth/check-status', async (req, res) => {
  try {
    // Check if there's an authenticated session via cookies or session storage
    // For a more accurate check, we need to consider both login and logout times
    const authenticatedUsers = Array.from(users.values()).filter(user => {
      if (!user.lastLogin) return false;
      
      // Check if user has logged in recently (within last 24 hours)
      const timeDiff = Date.now() - user.lastLogin.getTime();
      const loginRecent = timeDiff < 24 * 60 * 60 * 1000;
      
      if (!loginRecent) return false;
      
      // If user has logged out, check if logout happened after login
      if (user.lastLogout) {
        const loggedOutAfterLogin = user.lastLogout.getTime() > user.lastLogin.getTime();
        if (loggedOutAfterLogin) {
          console.log(`User ${user.email} logged out after login - not authenticated`);
          return false;
        }
      }
      
      console.log(`User ${user.email} is currently authenticated`);
      return true;
    });

    // If multiple authenticated users, prioritize users with access rights
    let selectedUser = null;
    
    if (authenticatedUsers.length > 0) {
      // First, try to find admin users
      const adminUsers = authenticatedUsers.filter(user => user.isAdmin);
      if (adminUsers.length > 0) {
        selectedUser = adminUsers.sort((a, b) => 
          (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0)
        )[0];
      }
      
      // If no admin, try to find sudo users
      if (!selectedUser) {
        const sudoUsers = authenticatedUsers.filter(user => user.isSudo);
        if (sudoUsers.length > 0) {
          selectedUser = sudoUsers.sort((a, b) => 
            (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0)
          )[0];
        }
      }
      
      // If no admin/sudo, try to find paid users
      if (!selectedUser) {
        const paidUsers = authenticatedUsers.filter(user => user.lifetimeAccess);
        if (paidUsers.length > 0) {
          selectedUser = paidUsers.sort((a, b) => 
            (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0)
          )[0];
        }
      }
      
      // Finally, fall back to most recent user
      if (!selectedUser) {
        selectedUser = authenticatedUsers.sort((a, b) => 
          (b.lastLogin?.getTime() || 0) - (a.lastLogin?.getTime() || 0)
        )[0];
      }
    }

        if (selectedUser) {
        // Check real payment status from database
        const realStatus = await checkUserPremiumStatus(selectedUser.email);
        
        // Update user with real database status
        if (realStatus.isPremium && !selectedUser.lifetimeAccess) {
          selectedUser.lifetimeAccess = true;
          selectedUser.plan = 'pro';
          console.log(`Updated ${selectedUser.email} to paid status from database`);
        }
        
        if (realStatus.isSudo && !selectedUser.isSudo) {
          selectedUser.isSudo = true;
          console.log(`Updated ${selectedUser.email} to sudo status from database`);
        }
        
        if (realStatus.isAdmin && !selectedUser.isAdmin) {
          selectedUser.isAdmin = true;
          console.log(`Updated ${selectedUser.email} to admin status from database`);
        }

        res.json({
          authenticated: true,
          user: {
            id: selectedUser.id,
            email: selectedUser.email,
            name: selectedUser.name,
            plan: selectedUser.plan,
            isAdmin: selectedUser.isAdmin,
            isSudo: selectedUser.isSudo,
            lifetimeAccess: selectedUser.lifetimeAccess
          }
        });
    } else {
      res.json({
        authenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ error: 'Auth status check failed' });
  }
});

// Debug endpoint to see all users (remove in production)
app.get('/api/debug/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.isAdmin,
    isSudo: user.isSudo,
    lifetimeAccess: user.lifetimeAccess,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  }));
  
  res.json({
    totalUsers: userList.length,
    users: userList
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

    if (!dodoConfig.apiKey) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const checkout = await createDodoCheckout(planType, user);
    
    // Store checkout info for later verification
    user.dodoCustomerId = checkout.checkoutId;
    
    res.json({ 
      url: checkout.checkoutUrl,
      amount: checkout.amount,
      currency: checkout.currency
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/payments/webhook', express.json(), async (req, res) => {
  try {
    // Verify webhook signature (you should implement this based on DodoPayments documentation)
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
    if (webhookSecret) {
      // Add signature verification here based on DodoPayments spec
      const signature = req.headers['dodo-signature'] || req.headers['x-dodo-signature'];
      // Implement signature verification logic
    }

    const result = await handleDodoWebhook(req.body);
    
    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook failed' });
  }
});

// Test payment success route (for demo purposes)
app.post('/api/payments/test-success', authenticateToken, async (req: any, res) => {
  try {
    const { planType } = req.body;
    const user = users.get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Simulate successful one-time payment
    user.plan = planType;
    user.paymentId = `pay_${uuidv4()}`;
    user.downloadToken = uuidv4();
    user.purchaseDate = new Date();
    user.lifetimeAccess = true;
    
    await sendEmail(
      user.email,
      'QuackQuery Pro - Lifetime Access Activated!',
      `
      <h1>Welcome to QuackQuery ${planType.charAt(0).toUpperCase() + planType.slice(1)}!</h1>
      <p>Your one-time purchase is complete! You now have lifetime access to QuackQuery Pro.</p>
      <a href="${allowedOrigin}/download?token=${user.downloadToken}" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Download QuackQuery Pro</a>
      <p><strong>No recurring charges - enjoy your lifetime access!</strong></p>
      `
    );
    
    res.json({ success: true, redirectUrl: `/download?success=true&plan=${planType}` });
  } catch (error) {
    console.error('Test payment error:', error);
    res.status(500).json({ error: 'Failed to process test payment' });
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

  const canDownload = user.lifetimeAccess || user.isAdmin || user.isSudo;
  const isSudo = user.isSudo || user.isAdmin;
  
  res.json({
    canDownload,
    plan: user.plan,
    downloadToken: user.downloadToken,
    requiresPayment: !canDownload,
    lifetimeAccess: user.lifetimeAccess,
    purchaseDate: user.purchaseDate,
    isSudo,
    isAdmin: user.isAdmin
  });
});

app.get('/api/download/:platform', authenticateToken, (req: any, res) => {
  const { platform } = req.params; // 'windows', 'mac', 'linux'
  const user = users.get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.lifetimeAccess && !user.isAdmin && !user.isSudo) {
    return res.status(403).json({ error: 'Premium purchase required for downloads' });
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
  console.log(`Download: ${user.email} (${user.plan}) downloaded ${platform} version - Lifetime Access: ${user.lifetimeAccess}`);

  res.json({ 
    downloadUrl,
    platform,
    version: '1.0.0',
    plan: user.plan,
    lifetimeAccess: user.lifetimeAccess,
    purchaseDate: user.purchaseDate
  });
});

// Direct GitHub release download for sudo users
app.get('/api/download/github/:platform', authenticateToken, async (req: any, res) => {
  const { platform } = req.params;
  const user = users.get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.isSudo && !user.isAdmin) {
    return res.status(403).json({ error: 'Sudo access required for direct GitHub downloads' });
  }

  // GitHub repository info - UPDATE THESE VALUES
  const GITHUB_OWNER = process.env.GITHUB_OWNER || 'kushagra2503';
  const GITHUB_REPO = process.env.GITHUB_REPO || 'Vision_Cheat';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub access not configured' });
  }

  // Asset names for different platforms - UPDATE THESE TO MATCH YOUR RELEASE FILES
  const assetNames = {
    windows: 'QuackQuerySetup.exe',  // Matches your actual file name
    mac: 'QuackQuery.dmg', 
    linux: 'QuackQuery.AppImage'
  };

  const assetName = assetNames[platform as keyof typeof assetNames];
  if (!assetName) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  try {
    // Get latest release info from GitHub API
    const fetch = (await import('node-fetch')).default;
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'QuackQuery-App'
        }
      }
    );

    if (!releaseResponse.ok) {
      throw new Error(`GitHub API error: ${releaseResponse.status}`);
    }

    const release = await releaseResponse.json() as any;
    
    // Find the asset for the requested platform
    const asset = release.assets?.find((asset: any) => asset.name === assetName);
    
    if (!asset) {
      return res.status(404).json({ 
        error: `No ${platform} release found. Available assets: ${release.assets?.map((a: any) => a.name).join(', ') || 'none'}` 
      });
    }

    // For private repos, get the authenticated download URL
    let downloadUrl = asset.url; // This requires authentication
    
    // Update download stats
    updateDownloadStats(user.plan);

    // Log download
    console.log(`GitHub Download: ${user.email} (SUDO) downloaded ${platform} version from private GitHub repo`);

    res.json({ 
      downloadUrl,
      platform,
      version: release.tag_name || 'latest',
      source: 'github-private',
      directDownload: true,
      assetName,
      requiresAuth: true,
      authHeader: `Bearer ${GITHUB_TOKEN}`
    });

  } catch (error) {
    console.error('GitHub download error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch release from GitHub',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: any, res) => {
  const allUsers = Array.from(users.values());
  
  // Real statistics
  const totalUsers = users.size;
  const totalSignedInUsers = allUsers.filter(u => u.lastLogin).length;
  const totalPurchasedUsers = allUsers.filter(u => u.lifetimeAccess).length;
  const totalSudoUsers = allUsers.filter(u => u.isSudo).length;
  const totalAdminUsers = allUsers.filter(u => u.isAdmin).length;
  
  const planCounts = allUsers.reduce((acc, user) => {
    acc[user.plan] = (acc[user.plan] || 0) + 1;
    return acc;
  }, {} as any);

  const recentUsers = allUsers
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  const recentPurchases = allUsers
    .filter(u => u.lifetimeAccess && u.purchaseDate)
    .sort((a, b) => new Date(b.purchaseDate!).getTime() - new Date(a.purchaseDate!).getTime())
    .slice(0, 10);

  const sudoUsers = allUsers.filter(u => u.isSudo);

      const totalRevenue = totalPurchasedUsers * 4.20;

  // Daily signup stats for the last 30 days
  const dailySignups: { [date: string]: number } = {};
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  last30Days.forEach(date => {
    dailySignups[date] = allUsers.filter(u => 
      u.createdAt.toISOString().split('T')[0] === date
    ).length;
  });

  res.json({
    totalUsers,
    totalSignedInUsers,
    totalPurchasedUsers,
    totalSudoUsers,
    totalAdminUsers,
    planCounts,
    totalRevenue,
    downloadStats,
    dailySignups,
    recentUsers: recentUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      lifetimeAccess: u.lifetimeAccess,
      purchaseDate: u.purchaseDate,
      isAdmin: u.isAdmin,
      isSudo: u.isSudo
    })),
    recentPurchases: recentPurchases.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      purchaseDate: u.purchaseDate,
      paymentId: u.paymentId
    })),
    sudoUsers: sudoUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      isAdmin: u.isAdmin
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
        type: 'free',
        features: ['Try QuackQuery', 'Limited sessions', 'Basic AI responses', 'Community support']
      },
      {
        id: 'pro',
        name: 'Download QuackQuery',
        price: 4.20,
        type: 'one_time',
        features: ['Lifetime access', 'Unlimited sessions', 'Advanced AI', 'Real-time assistance', 'Priority support', 'All future updates']
      },
      {
        id: 'enterprise',
        name: 'For Enterprise',
        price: 'Contact',
        type: 'custom',
        features: ['Everything in Pro', 'Team dashboard', 'Custom integrations', 'Dedicated support', 'On-premise deployment']
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

// Sync endpoint to bridge Better Auth sessions with our backend
app.post('/api/auth/sync-session', async (req, res) => {
  try {
    const { email, name, action } = req.body; // action: 'login' or 'logout'
    
    if (!email || !action) {
      return res.status(400).json({ error: 'Email and action are required' });
    }

    let user = Array.from(users.values()).find(u => u.email === email);
    
    // If user doesn't exist in our backend, create them
    if (!user && action === 'login') {
      // Check user's premium status from the database
      const premiumStatus = await checkUserPremiumStatus(email);
      
      user = {
        id: uuidv4(),
        email,
        password: '', // No password needed for Better Auth users
        name: name || email.split('@')[0],
        plan: premiumStatus.isPremium ? 'pro' : 'free',
        isAdmin: premiumStatus.isAdmin,
        isSudo: premiumStatus.isSudo,
        createdAt: new Date(),
        lifetimeAccess: premiumStatus.isPremium
      };
      users.set(user.id, user);
      console.log(`Created new user from Better Auth: ${email}, isPremium: ${premiumStatus.isPremium}, isSudo: ${premiumStatus.isSudo}`);
    } else if (user && action === 'login') {
      // Update existing user's premium status
      const premiumStatus = await checkUserPremiumStatus(email);
      user.plan = premiumStatus.isPremium ? 'pro' : 'free';
      user.isAdmin = premiumStatus.isAdmin;
      user.isSudo = premiumStatus.isSudo;
      user.lifetimeAccess = premiumStatus.isPremium;
      console.log(`Updated user premium status: ${email}, isPremium: ${premiumStatus.isPremium}, isSudo: ${premiumStatus.isSudo}`);
    }
    
    if (user) {
      if (action === 'login') {
        user.lastLogin = new Date();
        console.log(`Synced login for user: ${email} at ${user.lastLogin}`);
      } else if (action === 'logout') {
        user.lastLogout = new Date();
        console.log(`Synced logout for user: ${email} at ${user.lastLogout}`);
      }
    }

    res.json({ success: true, message: `Session ${action} synced successfully` });
  } catch (error) {
    console.error('Session sync error:', error);
    res.status(500).json({ error: 'Session sync failed' });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
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
      lifetimeAccess: true,
    };
    users.set(adminId, defaultAdmin);
          console.log('Default admin user created: radhikayash2@gmail.com / admin123');
  }
}); 