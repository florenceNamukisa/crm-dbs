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
import { settingsRoutes } from './routes/settings.js';
import { tenantRoutes } from './routes/tenants.js';
import { auditLogRoutes } from './routes/auditLogs.js';
import { emailTemplateRoutes } from './routes/emailTemplates.js';
import { scheduledExportRoutes } from './routes/scheduledExports.js';
import { roleRoutes } from './routes/roles.js';
import { taskRoutes } from './routes/tasks.js';
import { contactRoutes } from './routes/contacts.js';
import { dashboardRoutes } from './routes/dashboards.js';
import { predictiveAnalyticsRoutes } from './routes/predictiveAnalytics.js';
import { issueRoutes } from './routes/issues.js';
import { superAdminRoutes } from './routes/superadmin.js';
import { testEmailConfig } from './services/emailService.js';
import { startTaskReminderJob } from './jobs/taskReminderJob.js';
import { startScheduledExportJob } from './jobs/scheduledExportJob.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration with environment support
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://crm-tool-ebon.vercel.app',
  'https://crm-system-brown-kappa.vercel.app',
  'https://crm-system.vercel.app',
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
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
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

// Create default superadmin on startup
const createDefaultAdmin = async () => {
  try {
    const UserModule = await import('./models/User.js');
    const User = UserModule.default;

    const superAdminExists = await User.findOne({ role: 'superadmin' });

    if (!superAdminExists) {
      await User.create({
        name: 'Xtreative Admin',
        email: 'admin@xtreative.com',
        password: 'Admin@1234',
        role: 'superadmin',
        isActive: true,
        isFirstLogin: false
      });
      console.log('✅ Default superadmin created: admin@xtreative.com / Admin@1234');
    }
  } catch (error) {
    console.error('Error creating default superadmin:', error);
  }
};

// Update agent rankings based on performance
const updateAgentRankings = async () => {
  try {
    const User = await import('./models/User.js');
    const Deal = await import('./models/Deal.js');
    const Sale = await import('./models/Sale.js');

    const agents = await User.default.find({ role: 'agent', isActive: true });

    const agentPerformances = await Promise.all(
      agents.map(async (agent) => {
        const deals = await Deal.default.find({
          agent: agent._id,
          stage: 'won'
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sales = await Sale.default.find({
          agent: agent._id,
          saleDate: { $gte: startOfMonth },
          status: 'completed'
        });

        const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.finalAmount || 0), 0);
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

    agentPerformances.sort((a, b) => b.performanceScore - a.performanceScore);

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients/contacts', contactRoutes);
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
app.use('/api/settings', settingsRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/scheduled-exports', scheduledExportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/clients/contacts', contactRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/predictive-analytics', predictiveAnalyticsRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/superadmin', superAdminRoutes);

// Lightweight health/version endpoints
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
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
const SERVE_FRONTEND = process.env.SERVE_FRONTEND === 'true';
const frontendBuildCandidates = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, '../frontend/dist')
];

const frontendStaticDir = frontendBuildCandidates.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html'))
);

if (SERVE_FRONTEND && frontendStaticDir) {
  app.use(express.static(frontendStaticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
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

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, mongoOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB connected successfully');
      console.log('Database:', mongoose.connection.name);
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
    }

    if (process.env.TEST_EMAIL_ON_STARTUP === 'true' && process.env.NODE_ENV !== 'production') {
      await testEmailConfig();
    }

    await createDefaultAdmin();

    setInterval(updateAgentRankings, 6 * 60 * 60 * 1000);
    await updateAgentRankings();

    startTaskReminderJob();
    startScheduledExportJob();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });
};

startServer();