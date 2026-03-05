import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle,
  CreditCard,
  Trophy,
  XCircle,
  Star,
  Calendar,
  Clock,
  AlertCircle,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  UserCheck,
  Handshake,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
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
  Bar,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';
import { performanceAPI, dealsAPI, clientsAPI, salesAPI, schedulesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AgentDashboard = () => {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [dealsWon, setDealsWon] = useState(0);
  const [dealsLost, setDealsLost] = useState(0);
  const [pendingDeals, setPendingDeals] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [creditSales, setCreditSales] = useState(0);
  const [currentUserRating, setCurrentUserRating] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);

  // Progress / performance
  const [performance, setPerformance] = useState({});
  const [progress, setProgress] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);

  // Charts data
  const [salesFunnelData, setSalesFunnelData] = useState([]);
  const [closeRate, setCloseRate] = useState(0);
  const [totalDealsComparisonData, setTotalDealsComparisonData] = useState([]);
  const [dealsWonComparisonData, setDealsWonComparisonData] = useState([]);
  const [dealsLostComparisonData, setDealsLostComparisonData] = useState([]);
  const [dealsVsGoalData, setDealsVsGoalData] = useState([]);
  const [revenueComparisonData, setRevenueComparisonData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [dealsWonLostData, setDealsWonLostData] = useState([]);
  
  // New chart data for enhanced dashboard
  const [creditVsCashSalesData, setCreditVsCashSalesData] = useState([]);
  const [totalRevenueOverTimeData, setTotalRevenueOverTimeData] = useState([]);
  const [dealsVsSalesData, setDealsVsSalesData] = useState([]);
  const [pipelineValueData, setPipelineValueData] = useState([]);
  const [outstandingPaymentsData, setOutstandingPaymentsData] = useState([]);
  const [clientMeetingsData, setClientMeetingsData] = useState([]);
  const [conversionRatesData, setConversionRatesData] = useState([]);
  const [followUpStatusData, setFollowUpStatusData] = useState([]);
  const [revenueByProductData, setRevenueByProductData] = useState([]);

  const ORANGE_COLORS = ['#ff8c00', '#ff9f1c', '#ffb347', '#ffa500', '#ff7f00', '#ff6b00'];
  const funnelColors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

  // Format currency
  const formatUGX = (val) => `UGX ${Number(val || 0).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;

  const loadDashboardData = useCallback(async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;

      // Determine date range based on timeFilter
      const now = new Date();
      let startDate, endDate = new Date();
      
      if (timeFilter === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (timeFilter === 'weekly') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (timeFilter === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (timeFilter === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      } else if (timeFilter === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
      }

      // Fetch all data
      const [performanceResponse, clientsResponse, dealsResponse, salesResponse, schedulesResponse] = await Promise.allSettled([
        performanceAPI.getAgentPerformance(userId),
        clientsAPI.getAll(),
        dealsAPI.getAll(),
        salesAPI.getAll({ limit: 1000 }),
        schedulesAPI.getAll().catch(() => ({ data: { schedules: [] } })) // Handle schedules API gracefully
      ]);

      const perf = performanceResponse.status === 'fulfilled' ? performanceResponse.value?.data || {} : {};
      setPerformance(perf);
      const clients = clientsResponse.status === 'fulfilled' ? (clientsResponse.value?.data?.clients || clientsResponse.value?.clients || []) : [];
      const allDeals = dealsResponse.status === 'fulfilled' ? (dealsResponse.value?.data?.deals || dealsResponse.value?.data || dealsResponse.value || []) : [];
      const allSales = salesResponse.status === 'fulfilled' ? salesResponse.value?.data?.sales || [] : [];
      const allSchedules = schedulesResponse.status === 'fulfilled' ? (schedulesResponse.value?.data?.schedules || schedulesResponse.value?.data || []) : [];

      // Filter by date range
      const sales = allSales.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= startDate && saleDate < endDate;
      });

      const deals = allDeals.filter(deal => {
        const dealDate = new Date(deal.closedAt || deal.updatedAt || deal.createdAt || Date.now());
        return dealDate >= startDate && dealDate < endDate;
      });

      const meetings = allSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= startDate && scheduleDate < endDate;
      });

      // Calculate stats
      const rating = user?.performanceScore || perf.overallRating || 0;
      setCurrentUserRating(rating);

      let revenue = 0;
      sales.forEach(sale => {
        revenue += Number(sale.finalAmount) || 0;
      });
      setTotalRevenue(revenue);
      setSalesTotal(revenue);
      setTotalSalesCount(sales.length);

      setTotalClients(clients.length);
      setTotalDeals(deals.length);

      const won = deals.filter(d => 
        (d.stage && String(d.stage).toLowerCase() === 'won') ||
        (d.status && String(d.status).toLowerCase() === 'won') ||
        d.isWon === true || d.won === true
      ).length;
      setDealsWon(won);

      const lost = deals.filter(d =>
        (d.stage && String(d.stage).toLowerCase() === 'lost') ||
        (d.status && String(d.status).toLowerCase() === 'lost') ||
        d.isLost === true
      ).length;
      setDealsLost(lost);

      const pending = deals.filter(d => 
        !((d.stage && (String(d.stage).toLowerCase() === 'won' || String(d.stage).toLowerCase() === 'lost')) ||
          (d.status && (String(d.status).toLowerCase() === 'won' || String(d.status).toLowerCase() === 'lost')))
      ).length;
      setPendingDeals(pending);

      setCashSales(sales.filter(s => s.paymentMethod === 'cash').length);
      setCreditSales(sales.filter(s => s.paymentMethod === 'credit').length);

      // Calculate close rate
      const totalClosedDealsCount = won + lost;
      const rate = totalClosedDealsCount > 0 ? ((won / totalClosedDealsCount) * 100).toFixed(1) : 0;
      setCloseRate(rate);

      // Sales Funnel: Leads → Prospects → Opportunities → Closed-Won
      const leads = clients.length;
      const prospects = deals.length;
      const opportunities = deals.filter(d => 
        !((d.stage && (String(d.stage).toLowerCase() === 'won' || String(d.stage).toLowerCase() === 'lost')) ||
          (d.status && (String(d.status).toLowerCase() === 'won' || String(d.status).toLowerCase() === 'lost')))
      ).length;
      const closedWon = won;

      const maxFunnelValue = Math.max(leads, prospects, opportunities, closedWon, 1);
      setSalesFunnelData([
        { name: 'Leads', value: leads, percentage: `${((leads / maxFunnelValue) * 100).toFixed(0)}%` },
        { name: 'Prospects', value: prospects, percentage: `${((prospects / maxFunnelValue) * 100).toFixed(0)}%` },
        { name: 'Opportunities', value: opportunities, percentage: `${((opportunities / maxFunnelValue) * 100).toFixed(0)}%` },
        { name: 'Closed-Won', value: closedWon, percentage: `${((closedWon / maxFunnelValue) * 100).toFixed(0)}%` }
      ]);

      // Comparison data: This Month vs Last Month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

      const lastMonthSales = allSales.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= lastMonthStart && saleDate < lastMonthEnd;
      });

      const lastMonthDeals = allDeals.filter(deal => {
        const dealDate = new Date(deal.closedAt || deal.updatedAt || deal.createdAt || Date.now());
        return dealDate >= lastMonthStart && dealDate < lastMonthEnd;
      });

      const lastMonthWon = lastMonthDeals.filter(d =>
        (d.stage && String(d.stage).toLowerCase() === 'won') ||
        (d.status && String(d.status).toLowerCase() === 'won') ||
        d.isWon === true || d.won === true
      ).length;

      const lastMonthLost = lastMonthDeals.filter(d =>
        (d.stage && String(d.stage).toLowerCase() === 'lost') ||
        (d.status && String(d.status).toLowerCase() === 'lost') ||
        d.isLost === true
      ).length;

      let lastMonthRevenue = 0;
      lastMonthSales.forEach(sale => {
        lastMonthRevenue += Number(sale.finalAmount) || 0;
      });

      // Total Deals Comparison
      setTotalDealsComparisonData([
        { week: 'Week 1', thisMonth: Math.floor(deals.length * 0.2), lastMonth: Math.floor(lastMonthDeals.length * 0.2) },
        { week: 'Week 2', thisMonth: Math.floor(deals.length * 0.3), lastMonth: Math.floor(lastMonthDeals.length * 0.3) },
        { week: 'Week 3', thisMonth: Math.floor(deals.length * 0.25), lastMonth: Math.floor(lastMonthDeals.length * 0.25) },
        { week: 'Week 4', thisMonth: Math.floor(deals.length * 0.25), lastMonth: Math.floor(lastMonthDeals.length * 0.25) }
      ]);

      // Deals Won Comparison
      setDealsWonComparisonData([
        { week: 'Week 1', thisMonth: Math.floor(won * 0.2), lastMonth: Math.floor(lastMonthWon * 0.2) },
        { week: 'Week 2', thisMonth: Math.floor(won * 0.3), lastMonth: Math.floor(lastMonthWon * 0.3) },
        { week: 'Week 3', thisMonth: Math.floor(won * 0.25), lastMonth: Math.floor(lastMonthWon * 0.25) },
        { week: 'Week 4', thisMonth: Math.floor(won * 0.25), lastMonth: Math.floor(lastMonthWon * 0.25) }
      ]);

      // Deals Lost Comparison
      setDealsLostComparisonData([
        { week: 'Week 1', thisMonth: Math.floor(lost * 0.2), lastMonth: Math.floor(lastMonthLost * 0.2) },
        { week: 'Week 2', thisMonth: Math.floor(lost * 0.3), lastMonth: Math.floor(lastMonthLost * 0.3) },
        { week: 'Week 3', thisMonth: Math.floor(lost * 0.25), lastMonth: Math.floor(lastMonthLost * 0.25) },
        { week: 'Week 4', thisMonth: Math.floor(lost * 0.25), lastMonth: Math.floor(lastMonthLost * 0.25) }
      ]);

      // Deals Won vs Goal
      const dealsVsGoal = monthNames.map((month, idx) => {
        const monthDeals = allDeals.filter(d => {
          const dealDate = new Date(d.closedAt || d.updatedAt || d.createdAt);
          return dealDate.getMonth() === idx;
        });
        const monthWon = monthDeals.filter(d =>
          (d.stage && String(d.stage).toLowerCase() === 'won') ||
          (d.status && String(d.status).toLowerCase() === 'won') ||
          d.isWon === true || d.won === true
        ).length;
        return { month, closed: monthWon, goal: 5 };
      });
      setDealsVsGoalData(dealsVsGoal);

      // Revenue Comparison
      setRevenueComparisonData([
        { week: 'Week 1', thisMonth: Math.floor(revenue * 0.2), lastMonth: Math.floor(lastMonthRevenue * 0.2) },
        { week: 'Week 2', thisMonth: Math.floor(revenue * 0.3), lastMonth: Math.floor(lastMonthRevenue * 0.3) },
        { week: 'Week 3', thisMonth: Math.floor(revenue * 0.25), lastMonth: Math.floor(lastMonthRevenue * 0.25) },
        { week: 'Week 4', thisMonth: Math.floor(revenue * 0.25), lastMonth: Math.floor(lastMonthRevenue * 0.25) }
      ]);

      // Monthly sales data (sum sales per month)
      const monthlyMap = new Map();
      allSales.forEach(sale => {
        const d = new Date(sale.saleDate);
        const key = d.getMonth();
        const current = monthlyMap.get(key) || 0;
        monthlyMap.set(key, current + (Number(sale.finalAmount) || 0));
      });
      const monthlySales = monthNames.map((m, idx) => ({
        month: m,
        sales: monthlyMap.get(idx) || 0
      }));
      setMonthlySalesData(monthlySales);

      // Deals won vs lost per month
      const wonLostByMonth = monthNames.map((m, idx) => {
        const monthDeals = allDeals.filter(d => {
          const dd = new Date(d.closedAt || d.updatedAt || d.createdAt || Date.now());
          return dd.getMonth() === idx;
        });
        const monthWon = monthDeals.filter(d =>
          (d.stage && String(d.stage).toLowerCase() === 'won') ||
          (d.status && String(d.status).toLowerCase() === 'won') ||
          d.isWon === true || d.won === true
        ).length;
        const monthLost = monthDeals.filter(d =>
          (d.stage && String(d.stage).toLowerCase() === 'lost') ||
          (d.status && String(d.status).toLowerCase() === 'lost') ||
          d.isLost === true
        ).length;
        return { month: m, won: monthWon, lost: monthLost };
      });
      setDealsWonLostData(wonLostByMonth);

      // Progress toward monthly goal
      const goal = perf.monthlyGoal || perf.targetRevenue || revenue || 1;
      const progressValue = Math.min(100, Math.round((revenue / goal) * 100));
      setProgress(progressValue);

      // NEW CHART DATA PROCESSING
      
      // 1. Credit vs Cash Sales
      const cashSalesRevenue = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);
      const creditSalesRevenue = sales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);
      setCreditVsCashSalesData([
        { name: 'Cash Sales', value: cashSalesRevenue, count: sales.filter(s => s.paymentMethod === 'cash').length },
        { name: 'Credit Sales', value: creditSalesRevenue, count: sales.filter(s => s.paymentMethod === 'credit').length }
      ]);

      // 2. Total Revenue Over Time (combined deals and sales)
      const revenueTimeline = new Map();
      
      // Add sales revenue
      allSales.forEach(sale => {
        const d = new Date(sale.saleDate);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const current = revenueTimeline.get(key) || { dealsRevenue: 0, salesRevenue: 0, total: 0 };
        current.salesRevenue += Number(sale.finalAmount) || 0;
        current.total += Number(sale.finalAmount) || 0;
        revenueTimeline.set(key, current);
      });
      
      // Add deals revenue
      allDeals.filter(d => d.stage === 'won').forEach(deal => {
        const d = new Date(deal.closedAt || deal.updatedAt || deal.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const current = revenueTimeline.get(key) || { dealsRevenue: 0, salesRevenue: 0, total: 0 };
        current.dealsRevenue += Number(deal.value) || 0;
        current.total += Number(deal.value) || 0;
        revenueTimeline.set(key, current);
      });
      
      const revenueOverTime = Array.from(revenueTimeline.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          const [year, month] = key.split('-').map(Number);
          return {
            month: monthNames[month],
            year,
            dealsRevenue: value.dealsRevenue,
            salesRevenue: value.salesRevenue,
            total: value.total
          };
        });
      setTotalRevenueOverTimeData(revenueOverTime);

      // 3. Deals vs Sales Comparison
      const dealsVsSales = revenueOverTime.map(item => ({
        month: item.month,
        deals: item.dealsRevenue,
        sales: item.salesRevenue,
        total: item.total
      }));
      setDealsVsSalesData(dealsVsSales);

      // 4. Pipeline Value by Stage
      const pipelineStages = ['lead', 'qualification', 'proposal', 'negotiation'];
      const pipelineValue = pipelineStages.map(stage => {
        const stageDeals = allDeals.filter(d => d.stage === stage);
        const totalValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
        return {
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          value: totalValue,
          count: stageDeals.length
        };
      });
      setPipelineValueData(pipelineValue);

      // 5. Outstanding Payments
      const creditSales = allSales.filter(s => s.paymentMethod === 'credit');
      const outstanding = creditSales.filter(s => s.creditStatus !== 'paid').reduce((sum, s) => {
        const paid = s.payments?.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0) || 0;
        return sum + ((Number(s.finalAmount) || 0) - paid);
      }, 0);
      
      const overdue = creditSales.filter(s => {
        if (s.creditStatus === 'paid') return false;
        const dueDate = new Date(s.dueDate);
        return dueDate < new Date();
      }).reduce((sum, s) => {
        const paid = s.payments?.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0) || 0;
        return sum + ((Number(s.finalAmount) || 0) - paid);
      }, 0);
      
      setOutstandingPaymentsData([
        { name: 'Outstanding', value: outstanding },
        { name: 'Overdue', value: overdue }
      ]);

      // 6. Client Meetings with Deals Overlay
      const meetingsTimeline = new Map();
      allSchedules.forEach(schedule => {
        const d = new Date(schedule.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const current = meetingsTimeline.get(key) || { meetings: 0, dealsClosed: 0 };
        current.meetings += 1;
        meetingsTimeline.set(key, current);
      });
      
      // Count deals closed from meetings
      allDeals.filter(d => d.stage === 'won').forEach(deal => {
        const d = new Date(deal.closedAt || deal.updatedAt || deal.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const current = meetingsTimeline.get(key) || { meetings: 0, dealsClosed: 0 };
        current.dealsClosed += 1;
        meetingsTimeline.set(key, current);
      });
      
      const meetingsData = Array.from(meetingsTimeline.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          const [year, month] = key.split('-').map(Number);
          return {
            month: monthNames[month],
            meetings: value.meetings,
            dealsClosed: value.dealsClosed
          };
        });
      setClientMeetingsData(meetingsData);

      // 7. Conversion Rates
      const totalLeads = clients.length;
      const totalClosedDealsCount2 = allDeals.filter(d => d.stage === 'won' || d.stage === 'lost').length;
      const totalWonDeals = allDeals.filter(d => d.stage === 'won').length;
      
      setConversionRatesData([
        { stage: 'Leads', count: totalLeads, rate: 100 },
        { stage: 'Qualified', count: allDeals.length, rate: totalLeads > 0 ? ((allDeals.length / totalLeads) * 100).toFixed(1) : 0 },
        { stage: 'Closed', count: totalClosedDealsCount2, rate: allDeals.length > 0 ? ((totalClosedDealsCount2 / allDeals.length) * 100).toFixed(1) : 0 },
        { stage: 'Won', count: totalWonDeals, rate: totalClosedDealsCount2 > 0 ? ((totalWonDeals / totalClosedDealsCount2) * 100).toFixed(1) : 0 }
      ]);

      // 8. Follow-up Status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const allTasks = [];
      clients.forEach(client => {
        if (client.tasks) {
          client.tasks.forEach(task => {
            allTasks.push({
              ...task,
              clientName: client.name,
              dueDate: new Date(task.dueDate)
            });
          });
        }
      });
      
      const overdueTasks = allTasks.filter(task => task.dueDate < today && !task.completed);
      const dueTodayTasks = allTasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < tomorrow && !task.completed;
      });
      const upcomingTasks = allTasks.filter(task => task.dueDate >= tomorrow && !task.completed);
      
      setFollowUpStatusData([
        { name: 'Overdue', value: overdueTasks.length, color: '#ef4444' },
        { name: 'Due Today', value: dueTodayTasks.length, color: '#f59e0b' },
        { name: 'Upcoming', value: upcomingTasks.length, color: '#10b981' }
      ]);

      // 9. Revenue by Product/Service
      const productRevenue = new Map();
      allSales.forEach(sale => {
        if (sale.items) {
          sale.items.forEach(item => {
            const current = productRevenue.get(item.itemName) || 0;
            productRevenue.set(item.itemName, current + (Number(item.totalPrice) || 0));
          });
        }
      });
      
      const revenueByProduct = Array.from(productRevenue.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10) // Top 10 products
        .map(([name, value]) => ({ name, value }));
      setRevenueByProductData(revenueByProduct);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  }, [user, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
    const timer = setInterval(() => {
      loadDashboardData();
    }, 60000);
    return () => clearInterval(timer);
  }, [user, loadDashboardData]);

  // Build monthly progress from API data if available; otherwise fall back to zeros
  const monthlyProgressData = monthNames.map((m, idx) => {
    const source = performance.monthlyProgress && Array.isArray(performance.monthlyProgress)
      ? performance.monthlyProgress[idx]
      : null;
    return { month: m, progress: source?.progress ?? 0 };
  });

  const dealStatusData = [
    { name: 'Won', value: dealsWon || 0 },
    { name: 'Lost', value: dealsLost || 0 },
    { name: 'Pending', value: pendingDeals || 0 }
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
  const CHART_COLORS = ['#ff8c00', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

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
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Period:</label>
              <select
                value={timeFilter}
                onChange={(e) => {
                  setTimeFilter(e.target.value);
                  if (e.target.value === 'custom') {
                    setShowCustomDatePicker(true);
                  } else {
                    setShowCustomDatePicker(false);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Data shown for: <span className="font-medium capitalize">{timeFilter === 'custom' ? 'Custom Range' : timeFilter}</span>
            </div>
          </div>
          
          {/* Custom Date Range Picker */}
          {showCustomDatePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center space-x-4 pt-2 border-t"
            >
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    loadDashboardData();
                  } else {
                    toast.error('Please select both start and end dates');
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Apply
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Clients Met"
          value={totalClients}
          subtitle="Total engaged clients"
        />
        <StatCard
          icon={Trophy}
          title="Deals Won"
          value={dealsWon ?? 0}
          subtitle="Successful deals"
        />
        <StatCard
          icon={XCircle}
          title="Deals Lost"
          value={dealsLost ?? 0}
          subtitle="Unsuccessful deals"
        />
        <StatCard
          icon={TrendingUp}
          title="Pending Deals"
          value={pendingDeals}
          subtitle="In progress"
        />
        <StatCard
          icon={Target}
          title="Total Sales"
          value={totalSalesCount}
          subtitle="Transactions (count)"
        />
        <StatCard
          icon={DollarSign}
          title="Sales Amount"
          value={formatUGX(totalRevenue || 0)}
          subtitle="Total revenue"
        />
        <StatCard
          icon={CheckCircle}
          title="Cash Sales"
          value={cashSales || 0}
          subtitle="Paid in cash"
        />
        <StatCard
          icon={CreditCard}
          title="Credit Sales"
          value={creditSales || 0}
          subtitle="On credit"
        />
      </div>

      {/* NEW DASHBOARD LAYOUT */}
      
      {/* 1. Credit vs Cash Sales and Total Revenue Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit vs Cash Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={creditVsCashSalesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, count }) => `${name}: ${formatUGX(value)} (${count} sales)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {creditVsCashSalesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatUGX(value)} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={totalRevenueOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Legend />
              <Area type="monotone" dataKey="dealsRevenue" stackId="1" stroke="#10b981" fill="#10b981" name="Deals Revenue" />
              <Area type="monotone" dataKey="salesRevenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Sales Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 2. Deals vs Sales Comparison and Pipeline Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deals vs Sales Contribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dealsVsSalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Legend />
              <Bar dataKey="deals" fill="#10b981" name="Deals Revenue" />
              <Bar dataKey="sales" fill="#3b82f6" name="Sales Revenue" />
              <Line type="monotone" dataKey="total" stroke="#ff8c00" strokeWidth={3} name="Total Revenue" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Value by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineValueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Bar dataKey="value" fill="#ff8c00" name="Total Value" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 3. Outstanding Payments and Client Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Payments</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outstandingPaymentsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatUGX(value)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {outstandingPaymentsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Overdue' ? '#ef4444' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatUGX(value)} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Meetings & Deals Closed</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clientMeetingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="meetings" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ r: 4 }} 
                name="Client Meetings" 
              />
              <Line 
                type="monotone" 
                dataKey="dealsClosed" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={{ r: 4 }} 
                name="Deals Closed" 
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 4. Conversion Rates and Follow-up Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead to Deal Conversion Rates</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionRatesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line type="monotone" dataKey="rate" stroke="#ff8c00" strokeWidth={3} name="Conversion Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={followUpStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {followUpStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 5. Revenue by Product/Service (Optional) */}
      {revenueByProductData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products/Services by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByProductData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => formatUGX(value)} />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Progress and Performance */}
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
    </div>
  );
};

export default AgentDashboard;
