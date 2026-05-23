import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Search,
  Bell,
  Mail,
  Calendar as CalendarIcon,
  Settings,
  HelpCircle,
  ChevronDown,
  Filter,
  Plus,
  Phone,
  Mail as MailIcon,
  MessageCircle,
  MoreHorizontal,
  Eye,
  ChevronRight,
  ChevronLeft,
  Send
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
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { performanceAPI, dealsAPI, clientsAPI, salesAPI, schedulesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AgentDashboard = () => {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [salesValue, setSalesValue] = useState(89450);
  const [pipelineValue, setPipelineValue] = useState(245800);
  const [totalClients, setTotalClients] = useState(128);
  const [totalLeads, setTotalLeads] = useState(253);
  const [pipelineData, setPipelineData] = useState([]);
  const [chartsData, setChartsData] = useState({});
  const [recentClients, setRecentClients] = useState([]);
  const [leadsData, setLeadsData] = useState([]);
  const [activeDeals, setActiveDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;

      const [clientsRes, dealsRes, salesRes, schedulesRes] = await Promise.allSettled([
        clientsAPI.getAll(),
        dealsAPI.getAll(),
        salesAPI.getAll({ limit: 1000 }),
        schedulesAPI.getAll().catch(() => ({ data: { schedules: [] } }))
      ]);

      const clients = clientsRes.status === 'fulfilled' ? 
        (clientsRes.value?.data?.clients || clientsRes.value?.clients || []) : [];
      const deals = dealsRes.status === 'fulfilled' ? 
        (dealsRes.value?.data?.deals || dealsRes.value?.data || []) : [];
      const sales = salesRes.status === 'fulfilled' ? 
        (salesRes.value?.data?.sales || []) : [];
      const schedules = schedulesRes.status === 'fulfilled' ? 
        (schedulesRes.value?.data?.schedules || []) : [];

      // Set basic stats
      setTotalClients(clients.length);
      setTotalLeads(clients.length);

      // Calculate pipeline value
      const pipeline = deals.filter(d => 
        d.stage !== 'won' && d.stage !== 'lost'
      ).reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
      setPipelineValue(pipeline);

      // Calculate sales value
      const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.finalAmount) || 0), 0);
      setSalesValue(totalSales);

      // Pipeline data for funnel
      const stages = ['Lead', 'Proposal', 'Negotiations', 'Closed (Won)', 'Lost'];
      const stageCounts = [
        clients.length,
        deals.filter(d => d.stage === 'proposal').length,
        deals.filter(d => d.stage === 'negotiation').length,
        deals.filter(d => d.stage === 'won').length,
        deals.filter(d => d.stage === 'lost').length
      ];
      
      setPipelineData(stages.map((stage, idx) => ({
        name: stage,
        value: stageCounts[idx]
      })));

      // Recent clients
      setRecentClients(clients.slice(0, 5).map(client => ({
        ...client,
        status: 'Active'
      })));

      // Leads overview
      setLeadsData(clients.slice(0, 5).map((client, idx) => ({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        rating: ['Hot', 'Warm', 'Cold'][Math.floor(Math.random() * 3)],
        status: ['New', 'Contacted', 'Qualified'][Math.floor(Math.random() * 3)]
      })));

      // Active deals
      setActiveDeals(deals.slice(0, 5).map(deal => ({
        ...deal,
        stage: deal.stage || 'Proposal',
        probability: [50, 70, 25, 65, 50][Math.floor(Math.random() * 5)] + '%',
        closeDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      })));

      // Contacts
      setContacts(clients.slice(0, 5).map(client => ({
        name: client.name,
        organization: client.company,
        position: 'Manager',
        phone: client.phone
      })));

      // Upcoming meetings
      setUpcomingMeetings(schedules.slice(0, 3).map(schedule => ({
        title: schedule.title || 'Meeting',
        time: schedule.date,
        location: schedule.location || 'Online'
      })));

      // Tasks
      setTasks([
        { name: 'Follow up with Tech Solutions Inc.', priority: 'High' },
        { name: 'Send proposal to GreenField Agro Ltd.', priority: 'High' },
        { name: 'Call David Brown (Finance Pro)', priority: 'Medium' },
        { name: 'Prepare quote for Bright Future Ltd.', priority: 'Low' }
      ]);

      // Recent activities
      setRecentActivities([
        { action: 'You added a new lead', company: 'TechStart Inc.', time: '2 m ago' },
        { action: 'You updated deal', company: 'Cloud Services LLC', time: '1m ago' },
        { action: 'Email sent to', company: 'Sarah Williams', time: '1 hour ago' },
        { action: 'Call completed with', company: 'David Brown', time: '2 hours ago' },
        { action: 'Meeting scheduled with', company: 'Emma Davis', time: '3 hours ago' }
      ]);

      // Sales performance chart data
      const chartData = [
        { month: 'May 01', sales: 4000 },
        { month: 'May 08', sales: 5500 },
        { month: 'May 15', sales: 6200 },
        { month: 'May 22', sales: 7100 },
        { month: 'May 31', sales: 8900 }
      ];
      setChartsData({ salesData: chartData });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, timeFilter]);

  const StatCard = ({ icon: Icon, label, value, change, color = 'orange' }) => (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white text-3xl font-bold mt-2">{value}</p>
          {change && (
            <p className="text-green-400 text-sm mt-2">{change}</p>
          )}
        </div>
        <div className={`bg-${color}-600/20 p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
        </div>
      </div>
      {/* Mini chart */}
      <div className="mt-4 h-12">
        <svg viewBox="0 0 100 30" className="w-full h-full">
          <polyline
            points="0,20 10,15 20,18 30,12 40,14 50,8 60,10 70,5 80,8 90,3 100,6"
            fill="none"
            stroke={`var(--color-${color}-500)`}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Sales Agent Dashboard</h1>
            <p className="text-gray-400 text-sm">Welcome back, {user?.name || 'John Doe'}! Here's what's happening with your sales today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search leads, clients, contacts, deals..."
                className="bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg w-64 border border-gray-700 focus:border-orange-500 outline-none"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">7</span>
            </button>
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Mail className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">9</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-white">
              <Mail className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white">
              <CalendarIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white">
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-700">
              <div className="bg-orange-500 rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold">J</div>
              <div>
                <p className="text-white text-sm font-medium">{user?.name || 'John Doe'}</p>
                <p className="text-gray-400 text-xs">Sales Agent</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={DollarSign}
            label="Sales Value (This Month)"
            value={`$${(salesValue / 1000).toFixed(0)}K`}
            change="↑ 20.5% vs last month"
            color="orange"
          />
          <StatCard
            icon={Target}
            label="Pipeline Value"
            value={`$${(pipelineValue / 1000).toFixed(0)}K`}
            change="↑ 16.8% vs last month"
            color="orange"
          />
          <StatCard
            icon={Users}
            label="Total Clients"
            value={totalClients}
            change="↑ 12.4% vs last month"
            color="orange"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Leads"
            value={totalLeads}
            change="↑ 18.7% vs last month"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Clients */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Recent Clients</h3>
              <button className="text-gray-400 hover:text-white">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search clients..."
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm mb-4 border border-gray-700"
            />
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentClients.map((client, idx) => (
                <div key={idx} className="bg-gray-800 p-3 rounded-lg hover:bg-gray-750 transition cursor-pointer">
                  <p className="text-white text-sm font-medium">{client.name || 'Client'}</p>
                  <p className="text-gray-400 text-xs">{client.email || 'N/A'}</p>
                  <p className="text-gray-500 text-xs mt-1">{client.phone || 'N/A'}</p>
                  <p className="text-green-400 text-xs mt-1">● {client.status || 'Active'}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium">
              + Create New Client
            </button>
          </div>

          {/* Sales Pipeline Funnel */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Sales Pipeline Overview</h3>
              <button className="text-orange-500 text-sm hover:text-orange-400">View Full Pipeline</button>
            </div>
            <div className="space-y-3">
              {pipelineData.map((stage, idx) => {
                const percentages = [100, 45, 25, 17, 15];
                const colors = ['#ff8c00', '#ff9f1c', '#ffb347', '#7cb342', '#d32f2f'];
                const percentage = percentages[idx];
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-sm">{stage.name}</span>
                      <span className="text-gray-400 text-xs">{percentage} (18%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden flex items-center">
                      <div
                        className="h-full rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[idx]
                        }}
                      >
                        {percentage > 30 ? Math.round(percentage) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-gray-400 text-xs">
              Total Deals: 240 | Pipeline Value: ${(pipelineValue / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Calendar & Tasks */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">May 01 - May 31, 2025</h3>
              <button className="text-gray-400 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            {/* Mini Calendar */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <button className="text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-white text-sm font-medium">May 2025</span>
                <button className="text-gray-400"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <span key={day} className="text-gray-400 py-1">{day}</span>
                ))}
                {Array.from({ length: 31 }, (_, i) => (
                  <span
                    key={i}
                    className={`py-1 rounded ${i === 25 ? 'bg-orange-600 text-white font-bold' : 'text-gray-300'}`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-gray-400 text-xs">Today</div>
              {upcomingMeetings.slice(0, 2).map((meeting, idx) => (
                <div key={idx} className="bg-gray-800 p-2 rounded text-sm">
                  <p className="text-white font-medium text-xs">10:00 AM - Meeting with Tech Solutions Inc.</p>
                  <p className="text-gray-400 text-xs">10:00 AM - 11:00 AM</p>
                </div>
              ))}
            </div>

            <h4 className="text-white text-sm font-semibold mb-2">Tasks Due Today</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {tasks.slice(0, 4).map((task, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded cursor-pointer" />
                  <div className="flex-1">
                    <p className="text-gray-300 text-xs">{task.name}</p>
                    <span className={`text-xs font-medium ${
                      task.priority === 'High' ? 'text-orange-400' :
                      task.priority === 'Medium' ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 text-gray-400 text-xs hover:text-white">View All</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Leads Overview */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Leads Overview</h3>
              <div className="flex gap-2">
                <button className="text-gray-400 hover:text-white text-sm">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-1 rounded font-medium">
                  + New Lead
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-gray-400 text-left py-2 px-2">Contact Name</th>
                    <th className="text-gray-400 text-left py-2 px-2">Company</th>
                    <th className="text-gray-400 text-left py-2 px-2">Email</th>
                    <th className="text-gray-400 text-left py-2 px-2">Rating</th>
                    <th className="text-gray-400 text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.map((lead, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800 transition">
                      <td className="text-gray-300 py-3 px-2">{lead.name}</td>
                      <td className="text-gray-400 py-3 px-2 text-xs">{lead.company}</td>
                      <td className="text-gray-400 py-3 px-2 text-xs">{lead.email}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          lead.rating === 'Hot' ? 'bg-orange-500/20 text-orange-400' :
                          lead.rating === 'Warm' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>{lead.rating}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-green-400 text-xs">● {lead.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="w-full mt-4 text-center text-gray-400 text-xs hover:text-white py-2 border-t border-gray-700">
              View All Leads
            </button>
          </div>

          {/* Active Deals */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Active Deals</h3>
              <div className="flex gap-2">
                <button className="text-gray-400 hover:text-white text-sm">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-1 rounded font-medium">
                  + New Deal
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-gray-400 text-left py-2 px-2">Deal Name</th>
                    <th className="text-gray-400 text-left py-2 px-2">Client</th>
                    <th className="text-gray-400 text-left py-2 px-2">Amount</th>
                    <th className="text-gray-400 text-left py-2 px-2">Stage</th>
                    <th className="text-gray-400 text-left py-2 px-2">Close Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeals.map((deal, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800 transition">
                      <td className="text-gray-300 py-3 px-2">{deal.name || 'Deal'}</td>
                      <td className="text-gray-400 py-3 px-2 text-xs">{deal.client || 'Client'}</td>
                      <td className="text-gray-300 py-3 px-2">${(deal.value / 1000 || 0).toFixed(1)}K</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          deal.stage === 'Proposal' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>{deal.stage}</span>
                      </td>
                      <td className="text-gray-400 py-3 px-2 text-xs">{deal.closeDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="w-full mt-4 text-center text-gray-400 text-xs hover:text-white py-2 border-t border-gray-700">
              View All Deals
            </button>
          </div>

          {/* Contacts */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Contacts</h3>
              <button className="text-orange-500 text-sm hover:text-orange-400">View All</button>
            </div>
            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div key={idx} className="bg-gray-800 p-3 rounded-lg hover:bg-gray-750 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{contact.name}</p>
                      <p className="text-gray-400 text-xs">{contact.organization}</p>
                      <p className="text-gray-500 text-xs mt-1">{contact.position}</p>
                    </div>
                    <button className="text-gray-400 hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 text-gray-300 hover:text-white text-xs py-1 border border-gray-700 rounded hover:border-gray-600">
                      <Phone className="w-3 h-3 inline mr-1" /> Call
                    </button>
                    <button className="flex-1 text-gray-300 hover:text-white text-xs py-1 border border-gray-700 rounded hover:border-gray-600">
                      <MailIcon className="w-3 h-3 inline mr-1" /> Email
                    </button>
                    <button className="flex-1 text-gray-300 hover:text-white text-xs py-1 border border-gray-700 rounded hover:border-gray-600">
                      <MessageCircle className="w-3 h-3 inline mr-1" /> Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Sources Pie Chart */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-4">Top Lead Sources</h3>
            <div className="flex items-center justify-center h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Website', value: 35 },
                      { name: 'Referral', value: 25 },
                      { name: 'LinkedIn', value: 20 },
                      { name: 'Email Campaign', value: 15 },
                      { name: 'Cold Call', value: 5 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#ff8c00" />
                    <Cell fill="#ff9f1c" />
                    <Cell fill="#ffb347" />
                    <Cell fill="#7cb342" />
                    <Cell fill="#9c27b0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {[
                { name: 'Website', value: 35, color: 'bg-orange-600' },
                { name: 'Referral', value: 25, color: 'bg-orange-500' },
                { name: 'LinkedIn', value: 20, color: 'bg-orange-400' },
                { name: 'Email Campaign', value: 15, color: 'bg-green-600' },
                { name: 'Cold Call', value: 5, color: 'bg-purple-600' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-gray-300">{item.name}</span>
                  </span>
                  <span className="text-gray-400">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Performance Chart */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Sales Performance</h3>
              <button className="text-gray-400 hover:text-white text-sm">This Month</button>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { month: 'May 01', sales: 4000 },
                    { month: 'May 08', sales: 5500 },
                    { month: 'May 15', sales: 6200 },
                    { month: 'May 22', sales: 7100 },
                    { month: 'May 31', sales: 8900 }
                  ]}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff8c00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#ff8c00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-center border-t border-gray-700 pt-4">
              <div>
                <p className="text-gray-400 text-xs">Revenue Target</p>
                <p className="text-white font-semibold">$100,000</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Achieved</p>
                <p className="text-white font-semibold">$89,450</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Achievement</p>
                <p className="text-white font-semibold">89%</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs"></p>
                <button className="text-orange-500 text-sm hover:text-orange-400 font-medium">View Full Report</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Reports & AI Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Reports Shortcuts */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-4">Reports Shortcuts</h3>
            <div className="space-y-2">
              {[
                'Sales Performance Report',
                'Pipeline Report',
                'Leads Report',
                'Activity Report',
                'Revenue Report'
              ].map((report, idx) => (
                <button key={idx} className="w-full text-left text-gray-300 text-sm hover:text-white hover:bg-gray-800 p-2 rounded transition">
                  {report}
                </button>
              ))}
            </div>
            <button className="w-full mt-4 text-orange-500 text-sm hover:text-orange-400 font-medium">View All Reports</button>
          </div>

          {/* Recent Activities */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Recent Activities</h3>
              <button className="text-orange-500 text-sm hover:text-orange-400">View All</button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex gap-3 pb-3 border-b border-gray-800 last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs">{activity.action} <span className="text-white font-medium">{activity.company}</span></p>
                    <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Sales Assistants */}
          <div className="lg:col-span-1 bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col">
            <h3 className="text-white font-semibold mb-4">AI Sales Assistants</h3>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-gray-400 text-sm mb-4">How can I help you today?</p>
              <div className="space-y-2 mb-4">
                <button className="w-full text-left text-gray-300 text-xs hover:text-white hover:bg-gray-800 p-2 rounded transition">
                  → Show me my top deals
                </button>
                <button className="w-full text-left text-gray-300 text-xs hover:text-white hover:bg-gray-800 p-2 rounded transition">
                  → Which leads should I follow up today?
                </button>
                <button className="w-full text-left text-gray-300 text-xs hover:text-white hover:bg-gray-800 p-2 rounded transition">
                  → Write a follow-up email to a client
                </button>
                <button className="w-full text-left text-gray-300 text-xs hover:text-white hover:bg-gray-800 p-2 rounded transition">
                  → Show me my sales performance
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  className="flex-1 bg-gray-800 text-white text-xs px-3 py-2 rounded border border-gray-700 focus:border-orange-500"
                />
                <button className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
