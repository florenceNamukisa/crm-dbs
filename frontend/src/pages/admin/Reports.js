import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Filter, Calendar, Users, TrendingUp, BarChart3, Star } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dealsAPI, usersAPI, clientsAPI, schedulesAPI, salesAPI } from '../../services/api';
import api, { reportsAPI } from '../../services/api';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

const Reports = () => {
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);

  // stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [avgConversion, setAvgConversion] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);

  // agent data
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [dealsData, setDealsData] = useState([]);

  // charts
  const [revenueByAgent, setRevenueByAgent] = useState([]);
  const [dealStageDistribution, setDealStageDistribution] = useState([]);
  const [conversionTrend, setConversionTrend] = useState([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, monthly: [] });

  // additional datasets for export/import
  const [schedulesData, setSchedulesData] = useState([]);
  const [clientsData, setClientsData] = useState([]);
  const [agentSchedules, setAgentSchedules] = useState([]);

  // filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // helper: compute start/end dates for filters
  const computeRange = (p) => {
    const now = new Date();
    if (p === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (p === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    if (p === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    // yearly
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Export CSV helper for agentPerformance/table
  const buildCSVFromAgents = (agents) => {
    if (!Array.isArray(agents) || agents.length === 0) return '';
    const headers = ['Agent','Rating','TotalDeals','WonDeals','ConversionRate','ClosedRevenue','ExpectedRevenue'];
    const rows = agents.map(a => [
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.rating,
      a.totalDeals,
      a.wonDeals,
      a.conversionRate,
      a.closedRevenue,
      a.expectedRevenue
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProvider, setShareProvider] = useState(null); // 'email', 'gmail', 'outlook', 'whatsapp'
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [shareSubject, setShareSubject] = useState('CRM Report');

  const handleExport = (type = 'csv') => {
    // default export the agent performance table
    const csv = buildCSVFromAgents(agentPerformance || []);
    if (!csv) {
      toast.error('No data to export');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `crm-report-agents-${period}-${new Date().toISOString().slice(0,10)}.${type === 'excel' ? 'xlsx' : 'csv'}`;
    saveAs(blob, filename);
    toast.success('Export started');
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = window.prompt('Import target (deals, clients, schedules)?', 'deals');
    if (!target) return;
    const form = new FormData();
    form.append('file', file);
    form.append('target', target);
    try {
      const resp = await reportsAPI.importFile(form);
      toast.success(`Import completed (${resp.data.createdCount || 0} records)`);
      // reload data after import
      loadReportsData();
    } catch (err) {
      console.error('Import failed', err);
      toast.error(err.response?.data?.message || 'Import failed');
    }
  };

  const handleShare = async () => {
    const csv = buildCSVFromAgents(agentPerformance || []);
    if (!csv) {
      toast.error('No data to share');
      return;
    }

    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        // Create a Blob from the CSV data
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const file = new File([blob], `crm-report-${new Date().toISOString().slice(0, 10)}.csv`, { type: 'text/csv' });

        // Use native Web Share API
        await navigator.share({
          title: 'CRM Agent Performance Report',
          text: `CRM Agent Performance Report - Generated on ${new Date().toLocaleDateString()}`,
          files: [file]
        });
        toast.success('Report shared successfully');
      } else {
        // Fallback: if Web Share API not supported, show custom modal
        setShowShareModal(true);
        toast.info('Web Share not supported on this device. Use the form below.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the share dialog
        console.log('Share cancelled by user');
      } else {
        console.error('Share failed', err);
        toast.error('Failed to share report');
      }
    }
  };

  // Calculate expected revenue based on deal stage and probability
  const calculateExpectedRevenue = (deal) => {
    if (!deal.value) return 0;

    // Stage probability multipliers (confidence levels)
    const stageProbability = {
      'lead': 0.1,           // 10% - just a lead
      'qualification': 0.25, // 25% - qualified
      'proposal': 0.5,       // 50% - proposal sent
      'negotiation': 0.75,   // 75% - actively negotiating
      'won': 1.0,            // 100% - confirmed won
      'lost': 0              // 0% - lost
    };

    const stage = (deal.stage || 'lead').toLowerCase();
    const stageMult = stageProbability[stage] || 0.1;
    
    // Use custom probability if set, otherwise use stage multiplier
    const dealProbability = (deal.probability || 0) / 100;
    const finalProbability = dealProbability > 0 ? Math.max(dealProbability, stageMult) : stageMult;

    return Number(deal.value) * finalProbability;
  };

  // Calculate actual closed revenue (only from won deals)
  const calculateClosedRevenue = (deal) => {
    if (!deal.value) return 0;
    const stage = (deal.stage || 'lead').toLowerCase();
    return stage === 'won' ? Number(deal.value) : 0;
  };

  // auto-rate agents based on performance
  const rateAgent = (agent) => {
    const won = agent.wonDeals || 0;
    const total = agent.totalDeals || 1;
    const successRate = (won / total) * 100;
    const value = agent.totalValue || 0;

    let rating = 0;
    if (successRate >= 80 && value >= 100000) rating = 5;
    else if (successRate >= 70 && value >= 75000) rating = 4;
    else if (successRate >= 60 && value >= 50000) rating = 3;
    else if (successRate >= 50 && value >= 25000) rating = 2;
    else rating = 1;

    return Math.max(1, Math.min(5, rating));
  };

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const range = computeRange(period);

      // fetch deals and users in parallel
      const [dealsRes, usersRes] = await Promise.all([
        dealsAPI.getAll(range).catch(e => ({ data: [] })),
        usersAPI.getAll().catch(e => ({ data: [] }))
      ]);

      const deals = dealsRes?.data || [];
      const users = usersRes?.data || [];
      // fetch schedules, clients and sales for report capture
      const [schedulesRes, clientsRes, salesRes] = await Promise.all([
        schedulesAPI.getAll(range).catch(e => ({ schedules: [] })),
        clientsAPI.getAll(range).catch(e => ({ clients: [] })),
        salesAPI.getStats(range).catch(e => ({ data: { totalSales: 0, monthly: [] } }))
      ]);
      // Normalize schedules response into an array regardless of response shape
      let schedules = [];
      if (Array.isArray(schedulesRes)) schedules = schedulesRes;
      else if (Array.isArray(schedulesRes?.schedules)) schedules = schedulesRes.schedules;
      else if (Array.isArray(schedulesRes?.data)) schedules = schedulesRes.data;
      else if (Array.isArray(schedulesRes?.data?.schedules)) schedules = schedulesRes.data.schedules;

      // Normalize clients response into an array regardless of response shape
      let clients = [];
      if (Array.isArray(clientsRes)) clients = clientsRes;
      else if (Array.isArray(clientsRes?.clients)) clients = clientsRes.clients;
      else if (Array.isArray(clientsRes?.data)) clients = clientsRes.data;
      else if (Array.isArray(clientsRes?.data?.clients)) clients = clientsRes.data.clients;
      const sales = salesRes?.data || salesRes || { totalSales: 0, monthly: [] };
      setSchedulesData(schedules || []);
      setClientsData(clients || []);
      setSalesSummary({ totalSales: sales.totalSales || 0, monthly: sales.monthly || [] });
      const agents = Array.isArray(users) ? users.filter(u => u.role === 'agent') : [];

      setDealsData(deals);

      // build per-agent schedule summary
      try {
        const agentMap = {};
        (schedules || []).forEach(s => {
          const agent = s.agent || {};
          const agentId = agent._id || agent.id || (typeof s.agent === 'string' ? s.agent : 'unknown');
          if (!agentMap[agentId]) {
            agentMap[agentId] = { id: agentId, name: agent.name || 'Unknown', total: 0, attended: 0, missed: 0, upcoming: 0 };
          }
          agentMap[agentId].total += 1;
          if (s.status === 'completed') agentMap[agentId].attended += 1;
          else if (s.status === 'missed') agentMap[agentId].missed += 1;
          try {
            const dt = s.date ? new Date(s.date) : null;
            if (dt && dt > new Date()) agentMap[agentId].upcoming += 1;
          } catch (e) {
            // ignore invalid date
          }
        });
        const agentArr = Object.values(agentMap).sort((a,b) => b.total - a.total);
        setAgentSchedules(agentArr);
      } catch (e) {
        console.warn('Failed to compute agentSchedules', e);
      }

      // compute agent performance metrics
      const agentMap = {};
      agents.forEach(a => {
        agentMap[a._id || a.id] = {
          id: a._id || a.id,
          name: a.name,
          email: a.email,
          totalDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          pendingDeals: 0,
          totalValue: 0,           // sum of all deal values (for rating)
          closedRevenue: 0,        // actual revenue from won deals
          expectedRevenue: 0       // expected revenue (considering probability)
        };
      });

      // aggregate deal data per agent
      (deals || []).forEach(d => {
        const agentId = d.agent?._id || d.agent;
        if (agentMap[agentId]) {
          agentMap[agentId].totalDeals++;
          const value = Number(d.value) || 0;
          agentMap[agentId].totalValue += value;

          // Calculate revenues
          agentMap[agentId].closedRevenue += calculateClosedRevenue(d);
          agentMap[agentId].expectedRevenue += calculateExpectedRevenue(d);

          if (d.stage && d.stage.toLowerCase() === 'won') {
            agentMap[agentId].wonDeals++;
          } else if (d.stage && d.stage.toLowerCase() === 'lost') {
            agentMap[agentId].lostDeals++;
          } else {
            agentMap[agentId].pendingDeals++;
          }
        }
      });

      // compute ratings and conversions
      const perfList = Object.values(agentMap).map(a => ({
        ...a,
        conversionRate: a.totalDeals > 0 ? ((a.wonDeals / a.totalDeals) * 100).toFixed(1) : 0,
        rating: rateAgent(a)
      }));

      // sort by rating (top performers first)
      perfList.sort((a, b) => b.rating - a.rating);
      setAgentPerformance(perfList);

      // compute stats
      const totalRev = perfList.reduce((sum, a) => sum + a.closedRevenue, 0);
      const totalD = deals.length;
      const avgConv = perfList.length > 0 ? (perfList.reduce((sum, a) => sum + Number(a.conversionRate), 0) / perfList.length).toFixed(1) : 0;
      const activeA = perfList.filter(a => a.totalDeals > 0).length;

      setTotalRevenue(totalRev);
      setTotalDeals(totalD);
      setAvgConversion(avgConv);
      setActiveAgents(activeA);

      // revenue by agent (top 8) - use closedRevenue for actual closed deals
      const topAgents = perfList.slice(0, 8);
      setRevenueByAgent(topAgents.map(a => ({ name: a.name, revenue: a.closedRevenue, deals: a.wonDeals })));

      // deal stage distribution
      const stageMap = {};
      (deals || []).forEach(d => {
        const s = (d.stage || 'unknown').toString();
        stageMap[s] = (stageMap[s] || 0) + 1;
      });
      setDealStageDistribution(Object.keys(stageMap).map(k => ({ name: k, value: stageMap[k] })));

      // conversion trend over time (by week/month)
      const trendMap = {};
      perfList.forEach(a => {
        const monthKey = new Date().getFullYear() + '-' + (new Date().getMonth() + 1);
        if (!trendMap[monthKey]) trendMap[monthKey] = { period: monthKey, total: 0, won: 0 };
        trendMap[monthKey].total += a.totalDeals;
        trendMap[monthKey].won += a.wonDeals;
      });
      const trend = Object.values(trendMap).map(t => ({
        period: t.period,
        conversion: t.total > 0 ? ((t.won / t.total) * 100).toFixed(1) : 0
      }));
      setConversionTrend(trend.length > 0 ? trend : [{ period: 'Current', conversion: avgConv }]);

      // store clients and schedules for export/import/share
      setClientsData && setClientsData(clients);
      setSchedulesData && setSchedulesData(schedules);

    } catch (err) {
      console.error('Failed to load reports', err);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const COLORS = ['#ff8c00', '#60a5fa', '#34d399', '#f97316', '#ef4444', '#a78bfa', '#fbbf24', '#10b981'];

  const renderStars = (rating) => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  const StatCard = ({ icon: Icon, title, value, change, color = 'orange' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' ? (title.includes('Revenue') ? `UGX ${Number(value).toLocaleString('en-UG')}` : value.toLocaleString()) : value}
          </p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className="p-3 rounded-full bg-orange-50">
          <Icon className="w-6 h-6 text-orange-500" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time sales agent performance tracking and analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => handleExport('csv')} className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button onClick={() => handleExport('excel')} className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <label className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors cursor-pointer">
            <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleImportFile} className="hidden" />
            <span>Import</span>
          </label>
          <button onClick={() => setShowShareModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Period:</label>
          <div className="flex items-center space-x-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg transition ${p === period ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={TrendingUp} title="Total Revenue (Won)" value={totalRevenue} color="green" />
        <StatCard icon={Users} title="Total Deals" value={totalDeals} color="blue" />
        <StatCard icon={BarChart3} title="Avg Conversion Rate" value={`${avgConversion}%`} color="purple" />
        <StatCard icon={Calendar} title="Active Agents" value={activeAgents} color="orange" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Agent */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Top Agents</h3>
          {revenueByAgent.length === 0 ? (
            <p className="text-sm text-gray-500">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByAgent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString('en-UG')}`} />
                <Bar dataKey="revenue" fill="#ff8c00" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deal Stage Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Deal Stage Distribution</h3>
          {dealStageDistribution.length === 0 ? (
            <p className="text-sm text-gray-500">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dealStageDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {dealStageDistribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Conversion Trend */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Conversion Rate Trend</h3>
        {conversionTrend.length === 0 ? (
          <p className="text-sm text-gray-500">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line type="monotone" dataKey="conversion" stroke="#ff8c00" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Schedules and Clients Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Schedules Summary</h3>
          <p className="text-sm text-gray-600">Total scheduled: {Array.isArray(schedulesData) ? schedulesData.length : 0}</p>
          <p className="text-sm text-gray-600">Attended: {(Array.isArray(schedulesData) ? schedulesData.filter(s => s.status === 'completed') : []).length}</p>
          <p className="text-sm text-gray-600">Missed: {(Array.isArray(schedulesData) ? schedulesData.filter(s => s.status === 'missed') : []).length}</p>
          <p className="text-sm text-gray-600">Upcoming: {(Array.isArray(schedulesData) ? schedulesData.filter(s => new Date(s.date) > new Date()) : []).length}</p>

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">By Agent</h4>
            {(!Array.isArray(agentSchedules) || agentSchedules.length === 0) ? (
              <p className="text-sm text-gray-500">No agent schedules available for this period.</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">Agent</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-600">Total</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-600">Attended</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-600">Missed</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-600">Upcoming</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {agentSchedules.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 font-medium text-gray-900">{a.name}</td>
                        <td className="px-2 py-2 text-center text-gray-600">{a.total}</td>
                        <td className="px-2 py-2 text-center text-green-600 font-medium">{a.attended}</td>
                        <td className="px-2 py-2 text-center text-red-600 font-medium">{a.missed}</td>
                        <td className="px-2 py-2 text-center text-blue-600">{a.upcoming}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Clients Registered</h3>
          {clientsData.length === 0 ? (
            <p className="text-sm text-gray-500">No clients registered in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {clientsData.slice(0,50).map(c => (
                    <tr key={c._id} className="border-b">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">{c.email}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2">{c.agent?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sales Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Sales (won)</p>
            <p className="text-2xl font-bold">UGX {Number(salesSummary.totalSales || 0).toLocaleString('en-UG')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Monthly Breakdown</p>
            <div className="text-sm text-gray-600">
              {(salesSummary.monthly || []).slice(0,6).map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span>{m.month}</span>
                  <span>UGX {Number(m.total || 0).toLocaleString('en-UG')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Table with Ratings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agent Performance & Ratings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deals</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Won Deals</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentPerformance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    No agent data available for the selected period.
                  </td>
                </tr>
              ) : (
                agentPerformance.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{renderStars(agent.rating)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.totalDeals}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-green-600">{agent.wonDeals}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.conversionRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">UGX {Number(agent.closedRevenue).toLocaleString('en-UG')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">UGX {Number(agent.expectedRevenue).toLocaleString('en-UG')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* Share Modal (Fallback for browsers without Web Share API) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Share Report via Email</h3>
            <p className="text-sm text-gray-600 mt-2">Your device doesn't support native sharing. Send the report via email instead.</p>
            
            <div className="mt-4 space-y-3">
              <input 
                value={shareEmail} 
                onChange={(e) => setShareEmail(e.target.value)} 
                placeholder="recipient@example.com" 
                className="w-full p-3 border rounded" 
              />
              <input 
                value={shareSubject} 
                onChange={(e) => setShareSubject(e.target.value)} 
                placeholder="Email subject" 
                className="w-full p-3 border rounded" 
              />
            </div>
            
            <div className="mt-6 text-right space-x-2">
              <button 
                onClick={() => { setShowShareModal(false); setShareEmail(''); setShareProvider(null); }} 
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!shareEmail) {
                    toast.error('Please provide an email address');
                    return;
                  }
                  try {
                    const csv = buildCSVFromAgents(agentPerformance || []);
                    await reportsAPI.share({ to: shareEmail, subject: shareSubject, csv, filename: `crm-report-${Date.now()}.csv` });
                    toast.success('Report shared successfully via email');
                    setShowShareModal(false);
                    setShareEmail('');
                    setShareProvider(null);
                  } catch (err) {
                    console.error('Email share failed', err);
                    toast.error('Failed to send email');
                  }
                }} 
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Send Email
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Reports;