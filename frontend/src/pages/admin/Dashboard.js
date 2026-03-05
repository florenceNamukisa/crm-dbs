import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dealsAPI, salesAPI, clientsAPI, usersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

const StatCard = ({ icon: Icon, title, value }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
      <div className="p-3 rounded-full bg-orange-50">
        <Icon className="w-6 h-6 text-orange-500" />
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');

  // stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [agentsList, setAgentsList] = useState([]);
  const [dealsCount, setDealsCount] = useState(0);
  const [pendingDeals, setPendingDeals] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [totalDealsClosed, setTotalDealsClosed] = useState(0);

  // charts data
  const [dealsWonLostData, setDealsWonLostData] = useState([]);
  const [dealsWonLostTotals, setDealsWonLostTotals] = useState({ won: 0, lost: 0 });
  const [dealStagesByValueData, setDealStagesByValueData] = useState([]);
  const [closedDealsByRegionData, setClosedDealsByRegionData] = useState([]);
  const [monthlyRevenueByRegionData, setMonthlyRevenueByRegionData] = useState([]);
  const [companyDealsData, setCompanyDealsData] = useState([]);
  const [conversionRatesData, setConversionRatesData] = useState([]);
  const [salesCountData, setSalesCountData] = useState([]);

  const ORANGE_COLORS = ['#ff8c00', '#ff9f1c', '#ffb347', '#ffa500', '#ff7f00', '#ff6b00'];
  const DEAL_STAGE_COLORS = ['#0ea5e9', '#f59e0b', '#f97316', '#14b8a6', '#22c55e', '#ef4444'];

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
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const loadData = async () => {
    try {
      const range = computeRange(period);
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
      const isWon = (d) => normalize(d?.stage) === 'won' || normalize(d?.status) === 'won';
      const isLost = (d) => normalize(d?.stage) === 'lost' || normalize(d?.status) === 'lost';
      const getOutcomeDate = (d) => new Date(d?.closedAt || d?.updatedAt || d?.createdAt);
      const getRecordDate = (record, primary = 'createdAt') => new Date(record?.[primary] || record?.updatedAt || record?.createdAt);
      const isInRange = (dateInput) => {
        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) return false;
        return date >= startDate && date <= endDate;
      };
      const getId = (v) => {
        if (!v) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v._id) return String(v._id);
        return String(v);
      };

      const fetchAllDeals = async () => {
        const limit = 500;
        let page = 1;
        let pages = 1;
        const all = [];

        do {
          const res = await dealsAPI.getAll({ page, limit });
          const batch = res?.data?.deals || [];
          const pagination = res?.data?.pagination;
          pages = pagination?.pages || 1;
          all.push(...batch);
          page += 1;
        } while (page <= pages);

        return all;
      };

      const fetchAllSales = async () => {
        const limit = 500;
        let page = 1;
        let pages = 1;
        const all = [];

        do {
          const res = await salesAPI.getAll({ page, limit });
          const batch = res?.data?.sales || [];
          const pagination = res?.data?.pagination;
          pages = pagination?.pages || 1;
          all.push(...batch);
          page += 1;
        } while (page <= pages);

        return all;
      };

      const fetchAllClients = async () => {
        const limit = 500;
        let page = 1;
        let pages = 1;
        const all = [];

        do {
          const res = await clientsAPI.getAll({ page, limit });
          const batch = res?.data?.clients || [];
          const pagination = res?.data?.pagination;
          pages = pagination?.totalPages || 1;
          all.push(...batch);
          page += 1;
        } while (page <= pages);

        return all;
      };

      const [allSales, allDeals, allClients, usersRes] = await Promise.all([
        fetchAllSales().catch(() => []),
        fetchAllDeals().catch(() => []),
        fetchAllClients().catch(() => []),
        usersAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const deals = Array.isArray(allDeals) ? allDeals : [];
      const sales = Array.isArray(allSales) ? allSales : [];
      const clients = Array.isArray(allClients) ? allClients : [];
      const dealsInRange = deals.filter(d => isInRange(d?.createdAt || d?.updatedAt));
      const closedOutcomeDealsInRange = deals.filter(d => (isWon(d) || isLost(d)) && isInRange(getOutcomeDate(d)));
      const salesInRange = sales.filter(s => isInRange(s?.saleDate || s?.createdAt));
      const clientsInRange = clients.filter(c => isInRange(c?.createdAt || c?.updatedAt));

      // Sales
      const totalRevenueAmount = salesInRange.reduce((sum, sale) => sum + Number(sale?.finalAmount ?? sale?.totalAmount ?? 0), 0);
      setTotalRevenue(totalRevenueAmount);
      const salesChart = monthNames.map((m, idx) => {
        const count = salesInRange.filter(sale => {
          const date = getRecordDate(sale, 'saleDate');
          return !Number.isNaN(date.getTime()) && date.getMonth() === idx;
        }).length;
        return { month: m, sales: count };
      });
      setSalesCountData(salesChart);

      // Deals
      setDealsCount(dealsInRange.length);
      const pending = dealsInRange.filter(d => !d.stage || (d.stage && d.stage.toLowerCase() !== 'won' && d.stage.toLowerCase() !== 'lost')).length;
      setPendingDeals(pending);

      // Deals Won vs Lost chart (by month)
      const outcomeDeals = deals.filter(d => (isWon(d) || isLost(d)) && isInRange(getOutcomeDate(d)));
      const totals = outcomeDeals.reduce((acc, d) => {
        const date = getOutcomeDate(d);
        if (Number.isNaN(date.getTime())) return acc;
        if (isWon(d)) acc.won += 1;
        if (isLost(d)) acc.lost += 1;
        return acc;
      }, { won: 0, lost: 0 });
      setDealsWonLostTotals(totals);

      const wonLostChart = monthNames.map((month, idx) => {
        const monthDeals = outcomeDeals.filter(d => {
          const date = getOutcomeDate(d);
          if (Number.isNaN(date.getTime())) return false;
          return date.getMonth() === idx;
        });

        return {
          month,
          won: monthDeals.filter(isWon).length,
          lost: monthDeals.filter(isLost).length
        };
      });
      setDealsWonLostData(wonLostChart);

      const dealsClosed = closedOutcomeDealsInRange.filter(d => isWon(d)).length;
      setTotalDealsClosed(dealsClosed);

      // Clients
      setClientsCount(clientsInRange.length);

      // Agents
      const users = usersRes?.data || [];
      const agents = Array.isArray(users) ? users.filter(u => u.role === 'agent') : [];
      const agentsForCharts = agents.map(agent => ({ _id: String(agent._id), name: agent.name || 'Unnamed Agent' }));
      setAgentsList(agentsForCharts);
      setAgentsCount(agentsForCharts.length || 0);

      // Deal Stages by Value (for selected period)
      const stageOrder = ['lead', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
      const stageLabels = {
        lead: 'Lead',
        qualification: 'Qualification',
        proposal: 'Proposal',
        negotiation: 'Negotiation',
        won: 'Won',
        lost: 'Lost'
      };
      const stageValueMap = dealsInRange.reduce((acc, d) => {
        const stageKey = normalize(d?.stage);
        if (!stageOrder.includes(stageKey)) return acc;
        acc[stageKey] = (acc[stageKey] || 0) + (Number(d?.value) || 0);
        return acc;
      }, {});
      const stageValueData = stageOrder.map(stageKey => ({
        name: stageLabels[stageKey],
        value: stageValueMap[stageKey] || 0
      }));
      const hasStageValueData = stageValueData.some(item => Number(item.value) > 0);
      setDealStagesByValueData(hasStageValueData ? stageValueData : []);

      // Closed Won Deals by Agent
      const closedWonByMonthAgent = Array.from({ length: 12 }, () => ({}));
      closedOutcomeDealsInRange.forEach(d => {
        if (!isWon(d)) return;
        const date = getOutcomeDate(d);
        if (Number.isNaN(date.getTime())) return;
        const monthIdx = date.getMonth();
        const agentId = getId(d.agent);
        if (!agentId) return;
        closedWonByMonthAgent[monthIdx][agentId] = (closedWonByMonthAgent[monthIdx][agentId] || 0) + 1;
      });

      const closedByMonth = monthNames.map((month, idx) => {
        const dataPoint = { month };
        agentsForCharts.forEach(agent => {
          dataPoint[agent._id] = closedWonByMonthAgent[idx][agent._id] || 0;
        });
        return dataPoint;
      });
      setClosedDealsByRegionData(closedByMonth);

      // Monthly Revenue by Agent
      const revenueByAgentMonth = Array.from({ length: 12 }, () => ({}));

      salesInRange.forEach(sale => {
        const date = new Date(sale?.saleDate || sale?.createdAt);
        if (Number.isNaN(date.getTime())) return;

        const agentId = getId(sale?.agent);
        if (!agentId) return;

        const monthIndex = date.getMonth();
        const amount = Number(sale?.finalAmount ?? sale?.totalAmount ?? 0);
        revenueByAgentMonth[monthIndex][agentId] = (revenueByAgentMonth[monthIndex][agentId] || 0) + amount;
      });

      const revenueByMonth = monthNames.map((month, idx) => {
        const dataPoint = { month };
        agentsForCharts.forEach(agent => {
          dataPoint[agent._id] = revenueByAgentMonth[idx][agent._id] || 0;
        });
        return dataPoint;
      });
      setMonthlyRevenueByRegionData(revenueByMonth);

      // Company Total Deals (Open, Closed-Won, Closed-Lost)
      const companyDeals = monthNames.map((month, idx) => {
        const monthDeals = dealsInRange.filter(d => {
          const date = new Date(d.createdAt);
          return date.getMonth() === idx;
        });
        
        const open = monthDeals.filter(d => !d.stage || (d.stage.toLowerCase() !== 'won' && d.stage.toLowerCase() !== 'lost')).length;
        const won = monthDeals.filter(d => d.stage && d.stage.toLowerCase() === 'won').length;
        const lost = monthDeals.filter(d => d.stage && d.stage.toLowerCase() === 'lost').length;
        
        return { month, Open: open, 'Closed-Won': won, 'Closed-Lost': lost };
      });
      setCompanyDealsData(companyDeals);

      // Conversion Rates by Agent
      const totalDealsByMonthAgent = Array.from({ length: 12 }, () => ({}));
      const wonDealsByMonthAgent = Array.from({ length: 12 }, () => ({}));
      dealsInRange.forEach(d => {
        const date = new Date(d.createdAt);
        if (Number.isNaN(date.getTime())) return;
        const monthIdx = date.getMonth();
        const agentId = getId(d.agent);
        if (!agentId) return;
        totalDealsByMonthAgent[monthIdx][agentId] = (totalDealsByMonthAgent[monthIdx][agentId] || 0) + 1;
        if (isWon(d)) {
          wonDealsByMonthAgent[monthIdx][agentId] = (wonDealsByMonthAgent[monthIdx][agentId] || 0) + 1;
        }
      });

      const conversionRates = monthNames.map((month, idx) => {
        const dataPoint = { month };
        agentsForCharts.forEach(agent => {
          const total = totalDealsByMonthAgent[idx][agent._id] || 0;
          const won = wonDealsByMonthAgent[idx][agent._id] || 0;
          dataPoint[agent._id] = total > 0 ? Math.round((won / total) * 100) : 0;
        });
        return dataPoint;
      });
      setConversionRatesData(conversionRates);

    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
      toast.error('Failed to load dashboard data');
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center space-x-2">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${p === period ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards - Single Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={DollarSign} title="Revenue" value={`UGX ${Number(totalRevenue || 0).toLocaleString('en-UG')}`} />
        <StatCard icon={Users} title="Agents" value={agentsCount} />
        <StatCard icon={Users} title="Clients" value={clientsCount} />
        <StatCard icon={Target} title="Total Deals" value={dealsCount} />
        <StatCard icon={TrendingUp} title="Pending" value={pendingDeals} />
        <StatCard icon={Target} title="Closed Won" value={totalDealsClosed} />
      </div>

      {/* Deals Won vs Lost */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Deals Won vs Deals Lost</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Won</span>
              <span className="font-bold text-gray-900 tabular-nums">{dealsWonLostTotals.won.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Lost</span>
              <span className="font-bold text-gray-900 tabular-nums">{dealsWonLostTotals.lost.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {dealsWonLostTotals.won === 0 && dealsWonLostTotals.lost === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dealsWonLostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" allowDecimals={false} />
              <Tooltip formatter={(value, name, item) => [Number(value || 0).toLocaleString(), name || item?.dataKey || 'Value']} />
              <Legend />
              <Line type="monotone" dataKey="won" name="Won" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} />
              <Line type="monotone" dataKey="lost" name="Lost" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 1: Sales by Agent & Closed Won Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Deal Stages (by Value)</h3>
          {dealStagesByValueData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dealStagesByValueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {dealStagesByValueData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={DEAL_STAGE_COLORS[idx % DEAL_STAGE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString('en-UG')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Closed Won Deals by Agent</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={closedDealsByRegionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip />
              <Legend />
              {agentsList.map((agent, idx) => (
                <Bar key={agent._id} dataKey={agent._id} name={agent.name} fill={ORANGE_COLORS[idx % ORANGE_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Monthly Revenue & Company Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Revenue by Agent</h3>
          <p className="text-xs text-gray-500 mb-3">Computed from each sale&apos;s final amount for the selected period.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenueByRegionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="category" dataKey="month" stroke="#999" />
              <YAxis type="number" stroke="#999" />
              <Tooltip />
              <Legend />
              {agentsList.map((agent, idx) => (
                <Bar key={agent._id} dataKey={agent._id} name={agent.name} fill={ORANGE_COLORS[idx % ORANGE_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Company Total Deals</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={companyDealsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Open" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Closed-Won" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Closed-Lost" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Monthly Sales & Conversion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monthly Sales</h3>
            <span className="text-sm text-gray-600">Transactions</span>
          </div>
          {salesCountData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesCountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#999" />
                <YAxis stroke="#999" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sales" fill="#ff8c00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Rates by Agent</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionRatesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              {agentsList.map((agent, idx) => (
                <Line key={agent._id} type="monotone" dataKey={agent._id} name={agent.name} stroke={ORANGE_COLORS[idx % ORANGE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
