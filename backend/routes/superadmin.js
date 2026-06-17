import express from 'express';
import AuditLog from '../models/AuditLog.js';
import LoginLog from '../models/LoginLog.js';
import Notification from '../models/Notification.js';
import SystemMetrics from '../models/SystemMetrics.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Deal from '../models/Deal.js';
import Sale from '../models/Sale.js';
import Subscription from '../models/Subscription.js';
import SecurityBlock from '../models/SecurityBlock.js';
import { tenantAuth, requireSuperAdmin } from '../middleware/tenantAuth.js';
import { cpus, totalmem } from 'os';

const router = express.Router();

// Apply tenantAuth to all routes
router.use(tenantAuth);

// GET real-time activity feed
router.get('/activity-feed', requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 50, action, tenantId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (tenantId) query.tenant = tenantId;
    
    const logs = await AuditLog.find(query)
      .populate('user', 'name email')
      .populate('tenant', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    const formattedLogs = logs.map(log => ({
      id: log._id,
      action: log.action,
      description: log.description,
      user: log.user || { name: log.userName, email: log.userEmail },
      tenant: log.tenant,
      status: log.status,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt
    }));
    
    res.json({ activities: formattedLogs, total: formattedLogs.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET system health metrics
router.get('/system/health', requireSuperAdmin, async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const [tenantCount, userCount, metrics] = await Promise.all([
      Tenant.countDocuments(),
      User.countDocuments(),
      SystemMetrics.findOne().sort({ createdAt: -1 })
    ]);
    
    const health = {
      cpu: {
        usage: metrics?.cpuUsage || Math.round((cpuUsage.user + cpuUsage.system) / 1000000),
        cores: cpus().length
      },
      memory: {
        total: totalmem(),
        used: memory.heapUsed + memory.rss,
        usage: metrics?.memoryUsage || Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      storage: {
        total: metrics?.storageTotal || 0,
        used: metrics?.storageUsed || 0,
        usage: metrics?.storageUsage || 0
      },
      uptime: process.uptime(),
      activeSessions: metrics?.activeSessions || 0,
      apiLatency: metrics?.apiLatency || 0,
      tenantCount,
      userCount
    };
    
    res.json({ health });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET security alerts
router.get('/security/alerts', requireSuperAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [failedLogins, suspiciousIps, blockedEntities] = await Promise.all([
      LoginLog.countDocuments({ status: 'failed', timestamp: { $gte: thirtyDaysAgo } }),
      LoginLog.aggregate([
        { $match: { status: 'failed', timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $match: { count: { $gte: 5 } } },
        { $limit: 10 }
      ]),
      SecurityBlock.countDocuments({ isActive: true })
    ]);
    
    const alerts = [];
    
    if (failedLogins > 10) {
      alerts.push({
        id: 'failed-logins',
        severity: 'warning',
        title: 'High number of failed logins',
        description: `${failedLogins} failed login attempts in the last 30 days`,
        count: failedLogins
      });
    }
    
    suspiciousIps.forEach(item => {
      alerts.push({
        id: `suspicious-ip-${item._id}`,
        severity: 'critical',
        title: 'Suspicious IP detected',
        description: `${item.count} failed attempts from ${item._id}`,
        ip: item._id,
        count: item.count
      });
    });
    
    res.json({ alerts, blocks: blockedEntities });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET dashboard overview with all stats
router.get('/dashboard/overview', requireSuperAdmin, async (req, res) => {
  try {
    const startedAt = Date.now();
    
    const [
      tenantStats,
      userStats,
      revenueStats,
      subscriptionStats,
      activityStats,
      securityStats
    ] = await Promise.all([
      Tenant.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
            trial: { $sum: { $cond: [{ $eq: ['$status', 'trial'] }, 1, 0] } }
          }
        }
      ]),
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
          }
        }
      ]),
      Sale.aggregate([
        {
          $match: { status: { $ne: 'cancelled' } }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$finalAmount' },
            totalCount: { $sum: 1 },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                  '$finalAmount',
                  0
                ]
              }
            }
          }
        }
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'expired']] }, 1, 0] } }
          }
        }
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: null,
            todayActions: { $sum: 1 }
          }
        }
      ]),
      Promise.all([
        LoginLog.countDocuments({ status: 'failed', timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        SecurityBlock.countDocuments({ isActive: true })
      ])
    ]);

    const result = {
      tenants: tenantStats[0] || { total: 0, active: 0, suspended: 0, trial: 0 },
      users: userStats[0] || { total: 0, active: 0 },
      revenue: revenueStats[0] || { totalRevenue: 0, monthlyRevenue: 0 },
      subscriptions: subscriptionStats[0] || { active: 0, expired: 0 },
      activity: activityStats[0] || { todayActions: 0 },
      security: {
        failedLogins: securityStats[0],
        blockedEntities: securityStats[1]
      },
      mrr: await calculateMRR()
    };

    res.json({ overview: result, latency: Date.now() - startedAt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

async function calculateMRR() {
  const subscriptions = await Subscription.find({ status: 'active' });
  return subscriptions.reduce((mrr, sub) => {
    if (sub.pricing.interval === 'monthly') return mrr + sub.pricing.amount;
    if (sub.pricing.interval === 'yearly') return mrr + (sub.pricing.amount / 12);
    return mrr;
  }, 0);
}

// GET all leads across tenants
router.get('/leads', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, search, limit = 100 } = req.query;
    
    const query = { status: 'prospect' };
    if (tenantId) query.tenant = tenantId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const leads = await Client.find(query)
      .populate('tenant', 'name slug')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ leads });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all deals across tenants
router.get('/deals', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, status, stage, limit = 100 } = req.query;
    
    const query = {};
    if (tenantId) query.tenant = tenantId;
    if (status) query.status = status;
    if (stage) query.stage = stage;
    
    const deals = await Deal.find(query)
      .populate('tenant', 'name slug')
      .populate('client', 'firstName lastName')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ deals });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all sales/transactions across tenants
router.get('/sales', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, status, limit = 100 } = req.query;
    
    const query = {};
    if (tenantId) query.tenant = tenantId;
    if (status) query.status = status;
    
    const sales = await Sale.find(query)
      .populate('tenant', 'name slug')
      .populate('client', 'firstName lastName')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ sales });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all notifications across tenants (platform inbox for super admin)
router.get('/notifications', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, isRead, limit = 100 } = req.query;
    const query = {};
    if (tenantId) query.tenant = tenantId;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .populate('tenant', 'name slug')
      .populate('recipient', 'name email')
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/notifications/unread-count', requireSuperAdmin, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/notifications/:id/read', requireSuperAdmin, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/notifications/mark-all-read', requireSuperAdmin, async (req, res) => {
  try {
    const result = await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: `${result.modifiedCount} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/notifications/:id', requireSuperAdmin, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET invoices
router.get('/invoices', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, status, limit = 100 } = req.query;
    
    const query = {};
    if (tenantId) query.tenant = tenantId;
    if (status) query.status = status;
    
    const invoices = await Invoice.find(query)
      .populate('tenant', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET payments
router.get('/payments', requireSuperAdmin, async (req, res) => {
  try {
    const { tenantId, status, limit = 100 } = req.query;
    
    const query = {};
    if (tenantId) query.tenant = tenantId;
    if (status) query.status = status;
    
    const payments = await Payment.find(query)
      .populate('tenant', 'name slug')
      .populate('invoice')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create system announcement
router.post('/announcement', requireSuperAdmin, async (req, res) => {
  try {
    const { title, message, severity = 'info', tenantIds = [] } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    const query = tenantIds.length ? { _id: { $in: tenantIds } } : {};
    const tenants = await Tenant.find(query).lean();
    
    const notifications = [];
    for (const tenant of tenants) {
      const tenantUsers = await User.find({ tenant: tenant._id, isActive: true }).lean();
      for (const user of tenantUsers) {
        notifications.push({
          title,
          message,
          type: 'announcement',
          recipient: user._id,
          tenant: tenant._id,
          metadata: { severity, createdBy: req.user.userId }
        });
      }
    }
    
    await Notification.insertMany(notifications);
    
    await AuditLog.create({
      action: 'OTHER',
      description: `System announcement sent: ${title}`,
      user: req.user.userId,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      status: 'success',
      metadata: { tenantCount: tenants.length, userCount: notifications.length, severity }
    });
    
    res.json({ message: 'Announcement sent successfully', recipients: notifications.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET analytics summary
router.get('/analytics', requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter;
    switch (period) {
      case '7d': dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
      default: dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const [
      tenantGrowth,
      userGrowth,
      revenueGrowth,
      dealConversion,
      topTenants
    ] = await Promise.all([
      Tenant.aggregate([
        { $match: { createdAt: { $gte: dateFilter } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: dateFilter } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: dateFilter }, status: { $ne: 'cancelled' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$finalAmount' } } },
        { $sort: { _id: 1 } }
      ]),
      Deal.aggregate([
        { $match: { createdAt: { $gte: dateFilter } } },
        { $group: { _id: '$stage', count: { $sum: 1 } } }
      ]),
      Tenant.aggregate([
        { $project: { name: 1, slug: 1 } },
        {
          $lookup: {
            from: 'deals',
            localField: '_id',
            foreignField: 'tenant',
            as: 'deals'
          }
        },
        {
          $lookup: {
            from: 'clients',
            localField: '_id',
            foreignField: 'tenant',
            as: 'clients'
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            dealCount: { $size: '$deals' },
            clientCount: { $size: '$clients' }
          }
        },
        { $sort: { dealCount: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.json({
      growth: { tenants: tenantGrowth, users: userGrowth, revenue: revenueGrowth },
      dealStages: dealConversion,
      topTenants
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as superAdminRoutes };