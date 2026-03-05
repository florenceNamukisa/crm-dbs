import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes imports
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { clientRoutes } from './routes/clients.js';
import { dealRoutes } from './routes/deals.js';
import { scheduleRoutes } from './routes/schedules.js';
import { performanceRoutes } from './routes/performance.js';
import { reportsRoutes } from './routes/reports.js';
import { salesRoutes } from './routes/sales.js';
import { stockRoutes } from './routes/stock.js';
import { notificationRoutes } from './routes/notifications.js';
import { uploadRoutes } from './routes/upload.js';
import { meetingRoutes } from './routes/meetings.js';
import { testEmailConfig } from './services/emailService.js';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration with environment support
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://crm-tool-ebon.vercel.app',
  'https://crm.xtreative.com',
  'https://www.crm.xtreative.com'
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [];

const corsOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (if needed for public assets)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with improved timeout settings
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
};

// Validate MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  process.exit(1);
}

if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
  console.error('Current value:', MONGODB_URI);
  process.exit(1);
}

mongoose.connect(MONGODB_URI, mongoOptions)
  .then(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB connected successfully');
      console.log('Database:', mongoose.connection.name);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/meetings', meetingRoutes);

// Lightweight health/version endpoints for deployed debugging
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'crm-backend',
    node: process.version,
    env: process.env.NODE_ENV || 'unknown',
    db: mongoose.connection?.readyState === 1 ? mongoose.connection.name : null,
    commit: process.env.RENDER_GIT_COMMIT || null,
    branch: process.env.RENDER_GIT_BRANCH || null,
    timestamp: new Date().toISOString()
  });
});


// Serve frontend static files
const SERVE_FRONTEND = process.env.SERVE_FRONTEND === 'true';
const frontendBuildCandidates = [
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, '../frontend/dist')
];

const frontendStaticDir = frontendBuildCandidates.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html'))
);

if (SERVE_FRONTEND && frontendStaticDir) {
  app.use(express.static(frontendStaticDir));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Serve React app's index.html for all other routes
    const indexPath = path.join(frontendStaticDir, 'index.html');
    return res.sendFile(indexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'crm-backend', message: 'API is running' });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
}

// Create default admin on startup
const createDefaultAdmin = async () => {
  const User = await import('./models/User.js');
  try {
    const adminExists = await User.default.findOne({ role: 'admin' });

    if (!adminExists) {
      await User.default.create({
        name: 'System Administrator',
        email: 'xtreative@crm.com',
        password: 'admin123',
        role: 'admin',
        isFirstLogin: false
      });
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

// Update agent rankings based on performance
const updateAgentRankings = async () => {
  try {
    const User = await import('./models/User.js');
    const Deal = await import('./models/Deal.js');
    const Sale = await import('./models/Sale.js');

    // Get all agents
    const agents = await User.default.find({ role: 'agent', isActive: true });

    // Calculate performance scores for each agent
    const agentPerformances = await Promise.all(
      agents.map(async (agent) => {
        // Get deals stats
        const deals = await Deal.default.find({
          agent: agent._id,
          stage: 'won'
        });

        // Get sales stats for the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sales = await Sale.default.find({
          agent: agent._id,
          saleDate: { $gte: startOfMonth },
          status: 'completed'
        });

        const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);

        // Calculate performance score (weighted combination)
        const performanceScore = (deals.length * 100) + (totalSalesAmount * 0.1);

        return {
          agentId: agent._id,
          performanceScore,
          successfulDeals: deals.length,
          monthlySalesAmount: totalSalesAmount,
          totalSales: sales.length
        };
      })
    );

    // Sort by performance score (descending)
    agentPerformances.sort((a, b) => b.performanceScore - a.performanceScore);

    // Update rankings
    for (let i = 0; i < agentPerformances.length; i++) {
      const performance = agentPerformances[i];
      await User.default.findByIdAndUpdate(performance.agentId, {
        agentRank: i + 1,
        performanceScore: performance.performanceScore,
        successfulDeals: performance.successfulDeals,
        monthlySalesAmount: performance.monthlySalesAmount,
        totalSales: performance.totalSales,
        lastRankUpdate: new Date()
      });
    }

  } catch (error) {
    console.error('❌ Error updating agent rankings:', error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Server running on port ${PORT}`);
    console.log(`Login URL: http://localhost:${PORT}`);
  }

  // Test email configuration in development only
  if (process.env.TEST_EMAIL_ON_STARTUP === 'true' && process.env.NODE_ENV !== 'production') {
    await testEmailConfig();
  }

  await createDefaultAdmin();

  // Update agent rankings every 6 hours
  setInterval(updateAgentRankings, 6 * 60 * 60 * 1000);

  // Update rankings immediately on startup
  updateAgentRankings();
});
