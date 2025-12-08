import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  Calendar,
  TrendingUp,
  Phone,
  Mail,
  DollarSign,
  CheckCircle,
  CreditCard,
  Trophy,
  XCircle,
  Star
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { performanceAPI, dealsAPI, clientsAPI, salesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AgentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clientsMet: 0,
    dealsWon: 0,
    dealsLost: 0,
    pendingDeals: 0,
    scheduledMeetings: 0
  });
  const [performance, setPerformance] = useState({});
  const [progress, setProgress] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [dealsWonLostData, setDealsWonLostData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('monthly');

  // Format currency in UGX without decimals
  const formatUGX = (val) => `UGX ${Number(val || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;
  const [rankings, setRankings] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [currentUserRating, setCurrentUserRating] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
    loadRankings();
    // refresh every 60s to reflect DB changes automatically
    const timer = setInterval(() => {
      loadDashboardData();
      loadRankings();
    }, 60000);
    return () => clearInterval(timer);
  }, [user, timeFilter]);

  const loadRankings = async () => {
    try {
      const response = await performanceAPI.getRankings();
      const rankingsData = response.data || [];
      setRankings(rankingsData);

      // Find current user's rank
      const currentUserRanking = rankingsData.find(r => r.agent.id === user._id || r.agent.id === user.id);
      setUserRank(currentUserRanking);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;

      // Fetch performance, deals stats, clients, sales, and deals in parallel
      const [performanceResponse, dealsStatsResponse, clientsResponse, dealsResponse, salesResponse] = await Promise.all([
        performanceAPI.getAgentPerformance(userId),
        dealsAPI.getStats(),
        clientsAPI.getAll(),
        dealsAPI.getAll(),
        salesAPI.getAll({ limit: 1000 }) // Get agent-specific sales (filtered by backend)
      ]);

      const perf = performanceResponse?.data || {};
      const dealsStats = dealsStatsResponse?.data || {};
      const clients = clientsResponse?.data?.clients || clientsResponse?.clients || [];
      const deals = dealsResponse?.data?.deals || dealsResponse?.data || dealsResponse || [];
      const sales = salesResponse?.data?.sales || [];

      // Get current user rating from user object or performance data
      const rating = user?.performanceScore || perf.overallRating || 0;
      setCurrentUserRating(rating);

      // compute sales by month from sales data (more accurate than deals)
      const salesByMonth = new Array(12).fill(0);
      let totalSales = 0;

      sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate);
        const month = saleDate.getMonth();
        const amount = Number(sale.finalAmount) || 0;
        salesByMonth[month] += amount;
        totalSales += amount;
      });

      // Compute deals won vs lost by month
      const wonLostByMonth = new Array(12).fill(0).map(() => ({ won: 0, lost: 0 }));
      deals.forEach(deal => {
        const isWon = (deal.stage && String(deal.stage).toLowerCase() === 'won') ||
                      (deal.status && String(deal.status).toLowerCase() === 'won') ||
                      deal.isWon === true || deal.won === true;
        const isLost = (deal.stage && String(deal.stage).toLowerCase() === 'lost') ||
                       (deal.status && String(deal.status).toLowerCase() === 'lost') ||
                       deal.isLost === true;

        if (isWon || isLost) {
          const date = new Date(deal.closedAt || deal.updatedAt || deal.createdAt || Date.now());
          const month = date.getMonth();

          if (isWon) {
            wonLostByMonth[month].won += 1;
          } else if (isLost) {
            wonLostByMonth[month].lost += 1;
          }
        }
      });

      setPerformance(perf);
      // progress: compute as percentage of monthly goal
      const monthlyGoal = perf.monthlyGoal || 50000;
      const progressValue = monthlyGoal > 0 ? Math.min(100, Math.round((totalSales / monthlyGoal) * 100)) : 0;
      setProgress(progressValue);

      // compute counts from the agent-specific deals list for accuracy
      const wonDeals = deals.filter(d => ((d.stage && String(d.stage).toLowerCase() === 'won') || (d.status && String(d.status).toLowerCase() === 'won') || d.isWon === true || d.won === true));
      const lostDeals = deals.filter(d => ((d.stage && String(d.stage).toLowerCase() === 'lost') || (d.status && String(d.status).toLowerCase() === 'lost') || d.isLost === true));
      const pendingDealsCount = deals.filter(d => !((d.stage && (String(d.stage).toLowerCase() === 'won' || String(d.stage).toLowerCase() === 'lost')) || (d.status && (String(d.status).toLowerCase() === 'won' || String(d.status).toLowerCase() === 'lost')))).length;

      setStats({
        clientsMet: Array.isArray(clients) ? clients.length : (perf.clientsMet || 0),
        dealsWon: wonDeals.length || (dealsStats?.totalStats?.wonCount || 0),
        dealsLost: lostDeals.length || (dealsStats?.totalStats?.lostCount || 0),
        pendingDeals: pendingDealsCount || (dealsStats?.totalStats?.pendingCount || 0),
        scheduledMeetings: perf.scheduledMeetings || 0,
        totalSales: sales.length,
        totalSalesAmount: totalSales,
        cashSales: sales.filter(s => s.paymentMethod === 'cash').length,
        creditSales: sales.filter(s => s.paymentMethod === 'credit').length
      });

      setSalesTotal(totalSales);
      setMonthlySalesData(salesByMonth.map((value, idx) => ({ month: monthNames[idx], sales: value })));
      setDealsWonLostData(wonLostByMonth.map((data, idx) => ({
        month: monthNames[idx],
        won: data.won,
        lost: data.lost
      })));

    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  // Build monthly progress from API data if available; otherwise fall back to zeros
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyProgressData = monthNames.map((m, idx) => {
    const source = performance.monthlyProgress && Array.isArray(performance.monthlyProgress)
      ? performance.monthlyProgress[idx]
      : null;
    return { month: m, progress: source?.progress ?? 0 };
  });

  const dealStatusData = [
    { name: 'Won', value: stats.dealsWon || 0 },
    { name: 'Lost', value: stats.dealsLost || 0 },
    { name: 'Pending', value: stats.pendingDeals || 0 }
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b']; // green, red, orange

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'orange' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: color === 'orange' ? '#fff7ed' : '#f3f4f6' }}>
          <Icon className="w-6 h-6 text-orange-500" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}! Here's your performance overview.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Performance Rating</p>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(currentUserRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm font-semibold text-orange-600 ml-2">
              {currentUserRating.toFixed(1)}/5.0
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on won deal values
          </p>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Data shown for: <span className="font-medium capitalize">{timeFilter}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Clients Met"
          value={stats.clientsMet}
          subtitle="Total engaged clients"
        />
        <StatCard
          icon={Trophy}
          title="Deals Won"
          value={stats.dealsWon ?? 0}
          subtitle="Successful deals"
        />
        <StatCard
          icon={XCircle}
          title="Deals Lost"
          value={stats.dealsLost ?? 0}
          subtitle="Unsuccessful deals"
        />
        <StatCard
          icon={TrendingUp}
          title="Pending Deals"
          value={stats.pendingDeals}
          subtitle="In progress"
        />
        <StatCard
          icon={Target}
          title="Total Sales"
          value={formatUGX(stats.totalSales || 0)}
          subtitle="Transactions"
        />
        <StatCard
          icon={DollarSign}
          title="Sales Amount"
          value={formatUGX(stats.totalSalesAmount || 0)}
          subtitle="Total revenue"
        />
        <StatCard
          icon={CheckCircle}
          title="Cash Sales"
          value={stats.cashSales || 0}
          subtitle="Paid in cash"
        />
        <StatCard
          icon={CreditCard}
          title="Credit Sales"
          value={stats.creditSales || 0}
          subtitle="On credit"
        />
      </div>

      {/* Progress and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Tracker */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 lg:col-span-1"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Tracker</h3>
          <div className="text-center">
            <div className="relative inline-block">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="#ff8c00"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="377"
                  strokeDashoffset={377 - (377 * progress) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{progress}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">Target Completion</p>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Monthly Goal:</span>
                  <span className="font-medium">{formatUGX(performance.monthlyGoal || 50000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Achieved:</span>
                  <span className="font-medium">{formatUGX(salesTotal || performance.totalRevenue || 0)}</span>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Monthly Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#ff8c00"
                strokeWidth={3}
                dot={{ fill: '#ff8c00', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#ff8c00' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Deal Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dealStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dealStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

      </div>

      {/* Deals Won vs Lost */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deals Won vs Lost</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dealsWonLostData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="won" fill="#10b981" name="Won" />
            <Bar dataKey="lost" fill="#ef4444" name="Lost" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Rankings Section */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-orange-500 mr-2" />
            Your Performance Ranking
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Rank</p>
              <p className="text-2xl font-bold text-orange-600">#{userRank.rank}</p>
              <p className="text-sm text-gray-500">out of {rankings.length} agents</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Rating</p>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(userRank.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-orange-600">{userRank.rating.toFixed(1)}/5.0</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Keep up the great work!</span> Your rating is automatically calculated based on the value of your won deals compared to other agents.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlySalesData.length ? monthlySalesData : monthNames.map((m) => ({ month: m, sales: 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Line type="monotone" dataKey="sales" stroke="#ff8c00" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/clients')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Clients</span>
              </div>
              <span className="text-orange-500">→</span>
            </button>

            <button onClick={() => navigate('/deals')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Deals</span>
              </div>
              <span className="text-orange-500">→</span>
            </button>

            <button onClick={() => navigate('/sales')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Sales</span>
              </div>
              <span className="text-orange-500">→</span>
            </button>

            <button onClick={() => navigate('/meetings')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Meetings</span>
              </div>
              <span className="text-orange-500">→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentDashboard;