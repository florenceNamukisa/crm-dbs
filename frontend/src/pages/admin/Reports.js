import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download, Filter, Calendar, Users, TrendingUp, TrendingDown,
  DollarSign, ShoppingBag, BarChart3, RefreshCw, ChevronDown, ChevronRight,
  CreditCard, Banknote, Briefcase, CalendarCheck, CheckCircle, XCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { usersAPI, reportsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';

const Reports = () => {
  // Filters
  const [filters, setFilters] = useState({
    start: '',
    end: '',
    agent: ''
  });

  // Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [agentsList, setAgentsList] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  // Helper Date Functions
  const setPeriod = (period) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (period === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    }

    setFilters(prev => ({
      ...prev,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }));
  };

  // Load Agents for Filter
  useEffect(() => {
    usersAPI.getAll().then(res => {
      setAgentsList(res.data.filter(u => u.role === 'agent'));
    }).catch(err => console.error(err));
  }, []);

  // Load Report Data
  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;
      if (filters.agent) params.agent = filters.agent;

      const res = await reportsAPI.getAnalytics(params);
      setReportData(res.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Reload when filters change (debouncing might be needed for text inputs, but these are updated atomically)

  const handleExport = () => {
    if (!reportData?.weeklyData) return toast.error('No data to export');

    const headers = ['Week', 'Revenue', 'Sales', 'Cash Sales', 'Credit Sales', 'Deals Won', 'Clients Met'];
    const rows = reportData.weeklyData.map(w =>
      [w.week, w.revenue, w.salesCount, w.cashSales, w.creditSales, w.dealsWon, w.clientsMet].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `sales-report-${new Date().toLocaleDateString()}.csv`);
    toast.success('Report exported successfully');
  };

  const toggleRowExpand = (weekStart) => {
    setExpandedRows(prev => ({
      ...prev,
      [weekStart]: !prev[weekStart]
    }));
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) return `UGX ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `UGX ${(value / 1000).toFixed(1)}K`;
    return `UGX ${value?.toLocaleString() || 0}`;
  };

  // Colors
  const funnelColors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];
  const COLORS = ['#10b981', '#ef4444', '#f59e0b']; // Won, Lost, In Progress

  if (!reportData && loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Deals, Sales, and Performance Analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filters */}
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200">
            <button onClick={() => setPeriod('thisMonth')} className="px-3 py-1 text-xs font-medium hover:bg-orange-50 hover:text-orange-600 rounded">Month</button>
            <button onClick={() => setPeriod('lastMonth')} className="px-3 py-1 text-xs font-medium hover:bg-orange-50 hover:text-orange-600 rounded">Last Month</button>
            <button onClick={() => setPeriod('thisYear')} className="px-3 py-1 text-xs font-medium hover:bg-orange-50 hover:text-orange-600 rounded">Year</button>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
            <input
              type="date"
              className="text-sm border-none focus:outline-none bg-transparent"
              value={filters.start}
              onChange={e => setFilters({ ...filters, start: e.target.value })}
            />
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="text-sm border-none focus:outline-none bg-transparent"
              value={filters.end}
              onChange={e => setFilters({ ...filters, end: e.target.value })}
            />
          </div>

          <button
            onClick={loadReports}
            className="p-2 text-gray-500 hover:text-orange-600 transition-colors bg-white rounded-lg border border-gray-200"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      {reportData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <SummaryCard title="Total Sales" value={reportData.summary.totalSales} icon={ShoppingBag} color="bg-orange-500" />
          <SummaryCard title="Revenue" value={formatCurrency(reportData.summary.totalRevenue)} icon={DollarSign} color="bg-orange-600" />
          <SummaryCard title="Cash Sales" value={formatCurrency(reportData.summary.cashSalesAmount)} subValue={`${reportData.summary.cashSalesCount} sales`} icon={Banknote} color="bg-green-600" />
          <SummaryCard title="Credit Sales" value={formatCurrency(reportData.summary.creditSalesAmount)} subValue={`${reportData.summary.creditSalesCount} sales`} icon={CreditCard} color="bg-blue-600" />
          <SummaryCard title="Deals Won" value={reportData.summary.dealsWon} icon={CheckCircle} color="bg-emerald-500" />
          <SummaryCard title="Deals Lost" value={reportData.summary.dealsLost} icon={XCircle} color="bg-red-500" />
          <SummaryCard title="Clients Met" value={reportData.summary.clientsMet} icon={Users} color="bg-purple-500" />
          <SummaryCard title="Avg Rev/Deal" value={formatCurrency(reportData.summary.avgRevenuePerDealWon)} icon={TrendingUp} color="bg-teal-500" />
        </div>
      )}

      {/* Charts Section */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue & Sales Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.charts.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={false} name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sales Count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deal Outcomes */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Deal Outcomes</h3>
            <div className="h-[200px] w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.charts.dealOutcomes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportData.charts.dealOutcomes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Sales Funnel List */}
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Conversion Funnel</h4>
              {reportData.salesFunnel.map((item, index) => (
                <div key={item.name} className="flex items-center text-sm">
                  <div className="w-24 text-gray-500">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full mx-2 overflow-hidden">
                    <div className="h-full bg-orange-400" style={{ width: item.percentage }}></div>
                  </div>
                  <div className="w-12 text-right font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter Stats by Agent:</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]"
            value={filters.agent}
            onChange={e => setFilters({ ...filters, agent: e.target.value })}
          >
            <option value="">All Agents</option>
            {agentsList.map(agent => (
              <option key={agent._id} value={agent._id}>{agent.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Data Table */}
      {reportData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Weekly Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3 text-left font-medium">Week</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-center font-medium">Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Cash Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Credit Sales</th>
                  <th className="px-4 py-3 text-center font-medium">Deals Won</th>
                  <th className="px-4 py-3 text-center font-medium">Clients Met</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.weeklyData.map((week, index) => (
                  <React.Fragment key={week.weekStart}>
                    <tr
                      className={`hover:bg-orange-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => toggleRowExpand(week.weekStart)}
                    >
                      <td className="px-4 py-3">
                        {expandedRows[week.weekStart] ?
                          <ChevronDown className="w-4 h-4 text-orange-500" /> :
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{week.weekDisplay}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600">
                        {formatCurrency(week.revenue)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{week.salesCount}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(week.cashSales)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(week.creditSales)}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-medium">{week.dealsWon}</td>
                      <td className="px-4 py-3 text-center text-purple-600">{week.clientsMet}</td>
                    </tr>
                    {expandedRows[week.weekStart] && (
                      <tr className="bg-orange-50">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-4 gap-6 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Deals Lost</p>
                              <p className="font-semibold text-red-500">{week.dealsLost || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Avg Revenue/Sale</p>
                              <p className="font-semibold">{week.salesCount > 0 ? formatCurrency(week.revenue / week.salesCount) : 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Items Sold</p>
                              <p className="font-semibold">{week.items || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Conversion</p>
                              <p className="font-semibold">{week.clientsMet > 0 ? `${((week.dealsWon / week.clientsMet) * 100).toFixed(0)}%` : '0%'} (Met → Won)</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Performance Table */}
      {reportData && reportData.agentPerformance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Agent Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Agent</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Sales</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Clients Met</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Won</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Lost</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.agentPerformance.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{agent.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">
                      {agent.revenue > 0 ? formatCurrency(agent.revenue) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">{agent.salesCount}</td>
                    <td className="px-4 py-3 text-center">{agent.meetings}</td>
                    <td className="px-4 py-3 text-center text-emerald-600">{agent.wonDeals}</td>
                    <td className="px-4 py-3 text-center text-red-500">{agent.lostDeals}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(agent.winRate) > 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {agent.winRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-8">
        Report generated at {new Date().toLocaleString()} • Data reflects all sales agent activities
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, subValue, icon: Icon, color }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`${color} rounded-xl p-3 text-white shadow-md flex flex-col justify-between h-full min-h-[100px]`}
  >
    <div className="flex justify-between items-start">
      <p className="text-xs font-medium opacity-90">{title}</p>
      <div className="bg-white/20 p-1.5 rounded-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <div className="mt-2">
      <p className="text-xl font-bold">{value}</p>
      {subValue && <p className="text-[10px] opacity-80 mt-1">{subValue}</p>}
    </div>
  </motion.div>
);

export default Reports;