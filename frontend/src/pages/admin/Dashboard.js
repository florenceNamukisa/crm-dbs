import React, { useEffect, useState, useMemo } from 'react';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dealsAPI, salesAPI, schedulesAPI, clientsAPI, usersAPI, performanceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

const StatCard = ({ icon: Icon, title, value, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
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
  const [loading, setLoading] = useState(false);

  // individual chart periods
  const [salesPeriod, setSalesPeriod] = useState('monthly');
  const [agentsPeriod, setAgentsPeriod] = useState('monthly');
  const [clientsPeriod, setClientsPeriod] = useState('monthly');
  const [dealsPeriod, setDealsPeriod] = useState('monthly');

  // stats
  const [totalSales, setTotalSales] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [dealsCount, setDealsCount] = useState(0);
  const [pendingDeals, setPendingDeals] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);

  // charts & tables
  const [monthlyData, setMonthlyData] = useState([]);
  const [dealStageData, setDealStageData] = useState([]);
  const [dealsTable, setDealsTable] = useState([]);
  const [topAgentsData, setTopAgentsData] = useState([]);
  const [topClientsChartData, setTopClientsChartData] = useState([]);
  const [topClientsSeries, setTopClientsSeries] = useState([]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const range = computeRange(period);

      // fetch in parallel with individual chart period ranges
      const [salesRes, dealsRes, schedulesRes, clientsRes, usersRes, perfRes] = await Promise.all([
        salesAPI.getStats(computeRange(salesPeriod)).catch(e => ({ data: {} })),
        dealsAPI.getAll(computeRange(dealsPeriod)).catch(e => ({ data: [] })),
        schedulesAPI.getAll(range).catch(e => ({ data: [] })),
        clientsAPI.getAll(computeRange(clientsPeriod)).catch(e => ({ data: [] })),
        usersAPI.getAll().catch(e => ({ data: [] })),
        performanceAPI.getAllPerformance().catch(e => ({ data: {} }))
      ]);

      // sales
      const salesData = salesRes?.data || {};
      setTotalSales(salesData.totalSales || 0);

      // monthly chart: adapt backend monthly format if present
      if (Array.isArray(salesData.monthly) && salesData.monthly.length) {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const chart = monthNames.map((m, idx) => {
          const found = salesData.monthly.find(x => Number(x.month) === idx + 1);
          return { month: m, sales: found ? (found.total || 0) : 0 };
        });
        setMonthlyData(chart);
      } else {
        setMonthlyData([]);
      }

      // deals
      const deals = dealsRes?.data || [];
      setDealsTable(Array.isArray(deals) ? deals.slice(0, 50) : []);
      setDealsCount(Array.isArray(deals) ? deals.length : 0);
      const pending = Array.isArray(deals) ? deals.filter(d => !d.stage || (d.stage && d.stage.toLowerCase() !== 'won' && d.stage.toLowerCase() !== 'lost')).length : 0;
      setPendingDeals(pending);

      // deal stages pie
      const stageMap = {};
      (deals || []).forEach(d => {
        const s = (d.stage || 'unknown').toString();
        stageMap[s] = (stageMap[s] || 0) + (Number(d.value) || 0);
      });
      setDealStageData(Object.keys(stageMap).map((k) => ({ name: k, value: stageMap[k] })));

      // top agents: count won deals per agent from deals in selected period
      const perfData = perfRes?.data || {};
      const users_list = usersRes?.data || [];
      const agentsList = Array.isArray(users_list) ? users_list.filter(u => u.role === 'agent') : [];
      const dealsListForAgents = dealsRes?.data || [];
      const agentWonCounts = agentsList.map(agent => {
        const agentWonDeals = (dealsListForAgents || []).filter(d => {
          const agentMatch = (d.agent?._id === agent._id) || (d.agent === agent._id) || (d.agent?.toString() === agent._id?.toString());
          const wonMatch = (d.stage && d.stage.toLowerCase() === 'won') || (d.status && d.status.toLowerCase() === 'won');
          return agentMatch && wonMatch;
        });
        return { name: agent.name, value: agentWonDeals.length };
      }).sort((a,b) => b.value - a.value).slice(0, 8);

      setTopAgentsData(agentWonCounts);

      // top clients series (by won deals) - aggregate won deals per client from deals list
      const wonDeals = (dealsListForAgents || []).filter(d => (d.stage && d.stage.toLowerCase() === 'won') || (d.status && d.status.toLowerCase() === 'won'));
      const clientMap = {};
      wonDeals.forEach(d => {
        const cid = d.client?._id || d.client;
        const cname = d.client?.name || (typeof d.client === 'string' ? d.client : 'Unknown');
        clientMap[cid] = clientMap[cid] || { name: cname, monthly: {} };
        const date = new Date(d.closedAt || d.updatedAt || d.createdAt || Date.now());
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
        clientMap[cid].monthly[monthKey] = (clientMap[cid].monthly[monthKey] || 0) + 1;
        clientMap[cid].total = (clientMap[cid].total || 0) + 1;
      });
      const clientsArr = Object.keys(clientMap).map(k => ({ id: k, name: clientMap[k].name, total: clientMap[k].total, monthly: clientMap[k].monthly }));
      clientsArr.sort((a,b) => b.total - a.total);
      const topClients = clientsArr.slice(0, 5);

      // build series for the last 12 months
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      }
      const series = topClients.map(client => ({ id: client.id, name: client.name, data: months.map(mk => client.monthly[mk] || 0) }));
      setTopClientsSeries(series);

      // build chart data: array of { month: 'YYYY-MM', 'Client A': value, 'Client B': value }
      const chart = months.map((mk, idx) => {
        const obj = { month: mk };
        series.forEach(s => {
          const key = s.name;
          obj[key] = s.data[idx] || 0;
        });
        return obj;
      });
      setTopClientsChartData(chart);

      // clients
      const clients = clientsRes?.data || [];
      setClientsCount(Array.isArray(clients) ? clients.length : 0);

      // agents
      const users = usersRes?.data || [];
      const agents = Array.isArray(users) ? users.filter(u => u.role === 'agent') : [];
      setAgentsCount(agents.length || 0);

    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, salesPeriod, agentsPeriod, clientsPeriod, dealsPeriod]);

  const COLORS = ['#ff8c00', '#60a5fa', '#34d399', '#f97316', '#ef4444', '#a78bfa'];

  const dealsTableColumns = useMemo(() => [
    { key: 'title', label: 'Title' },
    { key: 'client', label: 'Client' },
    { key: 'agent', label: 'Agent' },
    { key: 'value', label: 'Value' },
    { key: 'stage', label: 'Stage' },
    { key: 'createdAt', label: 'Created' }
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}! Overview of platform activity.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">Filter:</div>
          <div className="flex items-center space-x-2">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded ${p === period ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={DollarSign} title="Total Sales" value={`UGX ${Number(totalSales || 0).toLocaleString('en-UG')}`} subtitle={loading ? 'Refreshing...' : ''} />
        <StatCard icon={Users} title="Total Agents" value={agentsCount} />
        <StatCard icon={Target} title="Total Deals" value={dealsCount} />
        <StatCard icon={TrendingUp} title="Pending Deals" value={pendingDeals} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monthly Sales</h3>
            <select value={salesPeriod} onChange={(e) => setSalesPeriod(e.target.value)} className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData.length ? monthlyData : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString('en-UG')}`} />
              <Line type="monotone" dataKey="sales" stroke="#ff8c00" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Deal Stages (by value)</h3>
            <select value={dealsPeriod} onChange={(e) => setDealsPeriod(e.target.value)} className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {dealStageData.length === 0 ? (
            <p className="text-sm text-gray-500">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dealStageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {dealStageData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `UGX ${Number(value).toLocaleString('en-UG')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Agents & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top Performing Agents (won deals)</h3>
            <select value={agentsPeriod} onChange={(e) => setAgentsPeriod(e.target.value)} className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {topAgentsData.length === 0 ? (
            <p className="text-sm text-gray-500">No data</p>
          ) : (
            <div className="space-y-3">
              {topAgentsData.map((a, idx) => (
                <div key={a.name} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div className="text-sm font-medium">
                    <span className="font-semibold text-orange-500">#{idx + 1}</span> {a.name}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{a.value} deals</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top Clients — Won Deals (last 12 months)</h3>
            <select value={clientsPeriod} onChange={(e) => setClientsPeriod(e.target.value)} className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {topClientsSeries.length === 0 ? (
            <p className="text-sm text-gray-500">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={topClientsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                {topClientsSeries.map((s, idx) => (
                  <Line key={s.id || s.name} type="monotone" dataKey={s.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Reports: deals table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Reports — Deals</h3>
          <div className="text-sm text-gray-500">Showing up to 50 rows</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {dealsTableColumns.map(col => (
                  <th key={col.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {dealsTable.length === 0 ? (
                <tr><td className="p-4 text-sm text-gray-500" colSpan={dealsTableColumns.length}>No deals found for the selected period.</td></tr>
              ) : dealsTable.map(d => (
                <tr key={d._id || d.id}>
                  <td className="px-4 py-3 text-sm">{d.title || '—'}</td>
                  <td className="px-4 py-3 text-sm">{d.client?.name || (d.client || '—')}</td>
                  <td className="px-4 py-3 text-sm">{d.agent?.name || (d.agent || '—')}</td>
                  <td className="px-4 py-3 text-sm">UGX {Number(d.value || 0).toLocaleString('en-UG')}</td>
                  <td className="px-4 py-3 text-sm">{d.stage || d.status || '—'}</td>
                  <td className="px-4 py-3 text-sm">{d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;