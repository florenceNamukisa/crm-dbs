import express from 'express';
import Dashboard from '../models/Dashboard.js';
import Client from '../models/Client.js';
import Deal from '../models/Deal.js';
import Sale from '../models/Sale.js';
import Meeting from '../models/Meeting.js';
import Schedule from '../models/Schedule.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { tenantAuth } from '../middleware/tenantAuth.js';
import { logAction } from '../utils/auditLog.js';

const router = express.Router();

router.use(tenantAuth);

// ─── SALES AGENT DASHBOARD ────────────────────────────────────────────────────
// GET /api/dashboards/sales — returns all data for the SalesAgentDashboard component
router.get('/sales', async (req, res) => {
  try {
    const tenantFilter = req.isSuperAdmin ? {} : { tenant: req.tenantId };
    const agentFilter = req.isSuperAdmin ? {} : { agent: req.user.userId };
    const tenantAgentFilter = { ...tenantFilter, ...agentFilter };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      leadsTotal,
      activeDealsData,
      wonDealsData,
      revenueData,
      pipelineData,
      revenueChartData,
      sourcesData,
      todayTasks,
      recentLeads,
      recentDeals,
      upcomingMeetings,
      recentActivities,
      recentNotifications,
      followupClients,
    ] = await Promise.all([
      Client.countDocuments({ ...tenantAgentFilter, status: 'prospect' }),
      Deal.find({ ...tenantAgentFilter, stage: { $in: ['lead', 'qualification', 'proposal', 'negotiation'] } }).lean(),
      Deal.find({ ...tenantAgentFilter, stage: 'won' }).lean(),
      Sale.aggregate([
        { $match: { ...tenantFilter, ...agentFilter, status: 'completed', saleDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Deal.aggregate([
        { $match: { ...tenantFilter, ...agentFilter } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { ...tenantFilter, ...agentFilter, status: 'completed', saleDate: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%b %d', date: '$saleDate' } }, v: { $sum: '$finalAmount' } } },
        { $sort: { '_id': 1 } },
      ]),
      Client.aggregate([
        { $match: tenantAgentFilter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Schedule.find({ ...tenantAgentFilter, date: { $gte: startOfDay, $lte: endOfDay }, status: 'scheduled' })
        .sort({ date: 1 }).limit(6).lean(),
      Client.find(tenantAgentFilter).sort({ createdAt: -1 }).limit(5).lean(),
      Deal.find({ ...tenantAgentFilter, stage: { $ne: 'won' } })
        .populate('client', 'name company').sort({ createdAt: -1 }).limit(5).lean(),
      Meeting.find({ ...tenantAgentFilter, scheduledTime: { $gte: now }, status: 'scheduled' })
        .populate('client', 'name company').sort({ scheduledTime: 1 }).limit(4).lean(),
      AuditLog.find(tenantFilter).sort({ createdAt: -1 }).limit(5).lean(),
      Notification.find({ ...tenantFilter, recipient: req.user.userId }).sort({ createdAt: -1 }).limit(4).lean(),
      Client.find({ ...tenantAgentFilter, 'tasks.0': { $exists: true } }).limit(5).lean(),
    ]);

    // ── Helper: time-ago ──────────────────────────────────────────────────────
    const timeAgo = (date) => {
      const diff = Math.floor((now - new Date(date)) / 1000);
      if (diff < 60) return `${diff} sec ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
    };

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalActive = activeDealsData.length;
    const totalWon = wonDealsData.length;
    const pipelineValue = activeDealsData.reduce((s, d) => s + (d.value || 0), 0);
    const revenueThisMonth = revenueData[0]?.total || 0;
    const totalDealsEver = totalActive + totalWon;
    const conversionRate = totalDealsEver > 0 ? ((totalWon / totalDealsEver) * 100).toFixed(1) : '0.0';
    const tasksDueToday = todayTasks.length;

    const kpis = [
      { label: 'Leads Assigned', value: String(leadsTotal), trend: 18, up: true },
      { label: 'Active Deals', value: String(totalActive), trend: 12, up: true },
      { label: 'Won Deals', value: String(totalWon), trend: 25, up: true },
      { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, trend: 16, up: true },
      { label: 'Revenue (This Month)', value: `$${revenueThisMonth.toLocaleString()}`, trend: 20, up: true },
      { label: 'Conversion Rate', value: `${conversionRate}%`, trend: 2.4, up: true },
      { label: 'Tasks Due Today', value: String(tasksDueToday), trend: 11, up: false },
      { label: 'Follow-ups Due', value: String(followupClients.length), trend: 7, up: false },
    ];

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const stageLabels = {
      lead: 'New Lead',
      qualification: 'Qualified',
      proposal: 'Proposal Sent',
      negotiation: 'Negotiation',
      won: 'Won',
      lost: 'Lost',
    };
    const maxCount = pipelineData.reduce((m, p) => Math.max(m, p.count), 1);
    const pipeline = pipelineData.map((p) => ({
      stage: stageLabels[p._id] || p._id,
      n: p.count,
      pct: Math.round((p.count / maxCount) * 100),
    }));

    // ── Revenue chart ─────────────────────────────────────────────────────────
    const revenue = revenueChartData.map((r) => ({ d: r._id, v: r.v }));

    // ── Lead sources ─────────────────────────────────────────────────────────
    const sourceColors = ['#ff6a00', '#ff8c00', '#ffb347', '#a855f7', '#6366f1', '#22c55e'];
    const totalLeads = sourcesData.reduce((s, r) => s + r.count, 0) || 1;
    const sources = sourcesData.map((s, i) => ({
      name: s._id || 'Unknown',
      value: s.count,
      pct: Math.round((s.count / totalLeads) * 100),
      color: sourceColors[i % sourceColors.length],
    }));

    // ── Tasks (today's schedules) ─────────────────────────────────────────────
    const priorityMap = { high: 'High', medium: 'Medium', low: 'Low' };
    const tasks = todayTasks.map((t) => ({
      t: t.title,
      time: new Date(t.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      p: priorityMap[t.priority] || 'Medium',
    }));

    // ── Leads ─────────────────────────────────────────────────────────────────
    const leads = recentLeads.map((l) => ({
      name: l.name,
      co: l.company || l.companyName || '',
      src: l.source || 'Website',
      status: l.leadStatus || 'New',
      score: l.engagementScore || 0,
      on: new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));

    // ── Deals ─────────────────────────────────────────────────────────────────
    const stageLabelMap = { proposal: 'Proposal Sent', negotiation: 'Negotiation', qualification: 'Qualified', lead: 'New Lead', won: 'Won' };
    const deals = recentDeals.map((d) => ({
      n: d.title,
      stage: stageLabelMap[d.stage] || d.stage,
      amt: `$${(d.value || 0).toLocaleString()}`,
      close: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD',
      prob: d.probability || 0,
    }));

    // ── Meetings ──────────────────────────────────────────────────────────────
    const meetings = upcomingMeetings.map((m) => ({
      co: m.client?.company || m.client?.name || 'Client',
      t: m.title,
      date: new Date(m.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date(m.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }));

    // ── Follow-ups ────────────────────────────────────────────────────────────
    const followups = followupClients.slice(0, 5).map((c) => {
      const nextTask = c.tasks?.find((t) => t.status !== 'completed');
      let when = 'Today';
      if (nextTask?.dueDate) {
        const due = new Date(nextTask.dueDate);
        const diff = Math.floor((due - now) / 86400000);
        if (diff === 0) when = 'Today';
        else if (diff === 1) when = 'Tomorrow';
        else when = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return { name: c.name, co: c.company || '', when };
    });

    // ── Activity feed ─────────────────────────────────────────────────────────
    const activities = recentActivities.map((a) => ({
      t: a.description,
      when: timeAgo(a.createdAt),
    }));

    // ── Messages/notifications ────────────────────────────────────────────────
    const messages = recentNotifications.map((n) => ({
      name: n.title,
      msg: n.message,
      time: timeAgo(n.createdAt),
      n: n.isRead ? 0 : 1,
    }));

    res.json({ kpis, pipeline, revenue, sources, tasks, leads, deals, meetings, followups, activities, messages });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all dashboards for current user
router.get('/', async (req, res) => {
  try {
    const query = req.isSuperAdmin
      ? { user: req.user.userId }
      : { user: req.user.userId, tenant: req.tenantId };

    const dashboards = await Dashboard.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ dashboards });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard by ID
router.get('/:id', async (req, res) => {
  try {
    const query = req.isSuperAdmin
      ? { _id: req.params.id, user: req.user.userId }
      : { _id: req.params.id, user: req.user.userId, tenant: req.tenantId };

    const dashboard = await Dashboard.findOne(query).lean();
    if (!dashboard) return res.status(404).json({ message: 'Dashboard not found' });

    res.json({ dashboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new dashboard
router.post('/', async (req, res) => {
  try {
    const { name, description, isDefault, isPublic, layout, widgets, filters } = req.body;

    if (!req.tenantId && !req.isSuperAdmin) {
      return res.status(400).json({ message: 'Tenant context is required' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Dashboard.updateMany(
        { user: req.user.userId, tenant: req.tenantId },
        { isDefault: false }
      );
    }

    const dashboard = await Dashboard.create({
      tenant: req.tenantId,
      user: req.user.userId,
      name,
      description,
      isDefault,
      isPublic,
      layout,
      widgets,
      filters
    });

    await logAction(req, 'CREATE_DASHBOARD', `Created dashboard ${dashboard.name}`, {
      entityType: 'Dashboard',
      entityId: dashboard._id
    });

    res.status(201).json({ dashboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update dashboard
router.put('/:id', async (req, res) => {
  try {
    const query = req.isSuperAdmin
      ? { _id: req.params.id, user: req.user.userId }
      : { _id: req.params.id, user: req.user.userId, tenant: req.tenantId };

    const dashboard = await Dashboard.findOne(query);
    if (!dashboard) return res.status(404).json({ message: 'Dashboard not found' });

    const updates = {};
    ['name', 'description', 'isDefault', 'isPublic', 'layout', 'widgets', 'filters'].forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await Dashboard.updateMany(
        { user: req.user.userId, tenant: req.tenantId, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    Object.assign(dashboard, updates);
    await dashboard.save();

    await logAction(req, 'UPDATE_DASHBOARD', `Updated dashboard ${dashboard.name}`, {
      entityType: 'Dashboard',
      entityId: dashboard._id
    });

    res.json({ dashboard });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete dashboard
router.delete('/:id', async (req, res) => {
  try {
    const query = req.isSuperAdmin
      ? { _id: req.params.id, user: req.user.userId }
      : { _id: req.params.id, user: req.user.userId, tenant: req.tenantId };

    const dashboard = await Dashboard.findOneAndDelete(query);
    if (!dashboard) return res.status(404).json({ message: 'Dashboard not found' });

    await logAction(req, 'DELETE_DASHBOARD', `Deleted dashboard ${dashboard.name}`, {
      entityType: 'Dashboard',
      entityId: dashboard._id
    });

    res.json({ message: 'Dashboard deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get KPI data for dashboard widgets
router.get('/:id/kpis', async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) return res.status(404).json({ message: 'Dashboard not found' });

    const tenantQuery = req.isSuperAdmin ? {} : { tenant: req.tenantId };
    const dateFilter = {};

    // Apply date filters if specified
    if (dashboard.filters?.dateRange?.start) {
      dateFilter.$gte = new Date(dashboard.filters.dateRange.start);
    }
    if (dashboard.filters?.dateRange?.end) {
      dateFilter.$lte = new Date(dashboard.filters.dateRange.end);
    }

    // Apply agent filters
    const agentFilter = {};
    if (dashboard.filters?.agents?.length > 0) {
      agentFilter.agent = { $in: dashboard.filters.agents };
    }

    const kpis = {};

    // Calculate KPIs based on widget configurations
    for (const widget of dashboard.widgets) {
      if (!widget.isActive) continue;

      switch (widget.type) {
        case 'kpi':
          kpis[widget.id] = await calculateKPI(widget.config, tenantQuery, dateFilter, agentFilter);
          break;
        case 'chart':
          kpis[widget.id] = await calculateChartData(widget.config, tenantQuery, dateFilter, agentFilter);
          break;
        case 'metric':
          kpis[widget.id] = await calculateMetric(widget.config, tenantQuery, dateFilter, agentFilter);
          break;
      }
    }

    res.json({ kpis });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper functions for KPI calculations
async function calculateKPI(config, tenantQuery, dateFilter, agentFilter) {
  const { metric } = config;

  switch (metric) {
    case 'total_clients': {
      const totalClients = await Client.countDocuments({
        ...tenantQuery,
        ...agentFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });
      return { value: totalClients, label: 'Total Clients' };
    }

    case 'active_deals': {
      const activeDeals = await Deal.countDocuments({
        ...tenantQuery,
        ...agentFilter,
        stage: { $in: ['proposal', 'negotiation', 'review'] },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });
      return { value: activeDeals, label: 'Active Deals' };
    }

    case 'monthly_sales': {
      const monthlySales = await Sale.aggregate([
        {
          $match: {
            ...tenantQuery,
            ...agentFilter,
            status: 'completed',
            ...(Object.keys(dateFilter).length > 0 && { saleDate: dateFilter })
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$finalAmount' }
          }
        }
      ]);
      return {
        value: monthlySales[0]?.total || 0,
        label: 'Monthly Sales',
        format: 'currency'
      };
    }

    case 'conversion_rate': {
      const totalDeals = await Deal.countDocuments({
        ...tenantQuery,
        ...agentFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });
      const wonDealsAgg = await Deal.countDocuments({
        ...tenantQuery,
        ...agentFilter,
        stage: 'won',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });
      const rate = totalDeals > 0 ? (wonDealsAgg / totalDeals * 100) : 0;
      return {
        value: Math.round(rate * 100) / 100,
        label: 'Conversion Rate',
        format: 'percentage'
      };
    }

    default:
      return { value: 0, label: 'Unknown Metric' };
  }
}

async function calculateChartData(config, tenantQuery, dateFilter, agentFilter) {
  const { metric } = config;

  switch (metric) {
    case 'sales_trend':
      return await getSalesTrendData(tenantQuery, dateFilter, agentFilter);
    case 'deal_status':
      return await getDealStatusData(tenantQuery, dateFilter, agentFilter);
    case 'client_growth':
      return await getClientGrowthData(tenantQuery, dateFilter, agentFilter);
    case 'performance_trend':
      return await getPerformanceTrendData(tenantQuery, dateFilter, agentFilter);
    default:
      return { data: [], labels: [] };
  }
}

// Helper functions for chart data
async function getSalesTrendData(tenantQuery, dateFilter, agentFilter) {
  const salesData = await Sale.aggregate([
    {
      $match: {
        ...tenantQuery,
        ...agentFilter,
        status: 'completed',
        ...(Object.keys(dateFilter).length > 0 && { saleDate: dateFilter })
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' }
        },
        total: { $sum: '$finalAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        name: {
          $concat: [
            { $toString: '$_id.month' },
            '/',
            { $toString: { $mod: ['$_id.year', 100] } }
          ]
        },
        value: '$total',
        count: 1
      }
    }
  ]);

  return { data: salesData };
}

async function getDealStatusData(tenantQuery, dateFilter, agentFilter) {
  const dealData = await Deal.aggregate([
    {
      $match: {
        ...tenantQuery,
        ...agentFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        name: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'prospect'] }, then: 'Prospect' },
              { case: { $eq: ['$_id', 'proposal'] }, then: 'Proposal' },
              { case: { $eq: ['$_id', 'negotiation'] }, then: 'Negotiation' },
              { case: { $eq: ['$_id', 'review'] }, then: 'Review' },
              { case: { $eq: ['$_id', 'won'] }, then: 'Won' },
              { case: { $eq: ['$_id', 'lost'] }, then: 'Lost' }
            ],
            default: 'Unknown'
          }
        },
        value: '$count'
      }
    }
  ]);

  return { data: dealData };
}

async function getClientGrowthData(tenantQuery, dateFilter, agentFilter) {
  const clientData = await Client.aggregate([
    {
      $match: {
        ...tenantQuery,
        ...agentFilter,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        name: {
          $concat: [
            { $toString: '$_id.month' },
            '/',
            { $toString: { $mod: ['$_id.year', 100] } }
          ]
        },
        value: '$count'
      }
    }
  ]);

  return { data: clientData };
}

async function getPerformanceTrendData(tenantQuery, dateFilter, agentFilter) {
  // Performance trend data - could be based on deal closures or sales targets
  const performanceData = await Deal.aggregate([
    {
      $match: {
        ...tenantQuery,
        ...agentFilter,
        ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter })
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$updatedAt' },
          month: { $month: '$updatedAt' }
        },
        won: {
          $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] }
        },
        total: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        name: {
          $concat: [
            { $toString: '$_id.month' },
            '/',
            { $toString: { $mod: ['$_id.year', 100] } }
          ]
        },
        value: {
          $multiply: [
            { $divide: ['$won', { $max: ['$total', 1] }] },
            100
          ]
        }
      }
    }
  ]);

  return { data: performanceData };
}

async function calculateMetric(_config, _tenantQuery, _dateFilter, _agentFilter) {
  // Custom metric calculations
  return { value: 0, trend: 0 };
}

export { router as dashboardRoutes };