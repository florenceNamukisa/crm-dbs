import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Target, 
  Calendar,
  TrendingUp,
  Phone,
  Mail
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
  ResponsiveContainer 
} from 'recharts';
import { performanceAPI, dealsAPI, clientsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AgentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clientsMet: 0,
    dealsClosed: 0,
    pendingDeals: 0,
    scheduledMeetings: 0
  });
  const [performance, setPerformance] = useState({});
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load performance data
      const performanceResponse = await performanceAPI.getAgentPerformance(user.id);
      setPerformance(performanceResponse.data);
      
      // Calculate progress (simplified)
      const progressValue = performanceResponse.data.progress || 0;
      setProgress(progressValue);

      // Update stats
      setStats({
        clientsMet: performanceResponse.data.clientsMet || 0,
        dealsClosed: performanceResponse.data.closedDeals || 0,
        pendingDeals: performanceResponse.data.pendingDeals || 0,
        scheduledMeetings: 5 // Sample data
      });

    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  const monthlyProgressData = [
    { month: 'Jan', progress: 45 },
    { month: 'Feb', progress: 60 },
    { month: 'Mar', progress: 55 },
    { month: 'Apr', progress: 75 },
    { month: 'May', progress: 80 },
    { month: 'Jun', progress: 65 },
    { month: 'Jul', progress: 85 },
    { month: 'Aug', progress: 70 },
    { month: 'Sep', progress: 90 },
    { month: 'Oct', progress: 75 },
    { month: 'Nov', progress: 95 },
    { month: 'Dec', progress: progress },
  ];

  const dealStatusData = [
    { name: 'Closed', value: stats.dealsClosed },
    { name: 'Pending', value: stats.pendingDeals }
  ];

  const COLORS = ['#ff8c00', '#ffa94d'];

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
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
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
          <p className="text-sm text-gray-600">Overall Rating</p>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(performance.overallRating || 0)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm text-gray-600 ml-2">
              {performance.overallRating?.toFixed(1) || '0.0'}
            </span>
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
          icon={Target}
          title="Deals Closed"
          value={stats.dealsClosed}
          subtitle="Successful deals"
        />
        <StatCard
          icon={TrendingUp}
          title="Pending Deals"
          value={stats.pendingDeals}
          subtitle="In progress"
        />
        <StatCard
          icon={Calendar}
          title="Scheduled"
          value={stats.scheduledMeetings}
          subtitle="Upcoming meetings"
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
                <span className="font-medium">$50,000</span>
              </div>
              <div className="flex justify-between">
                <span>Achieved:</span>
                <span className="font-medium">${performance.totalRevenue?.toLocaleString() || '0'}</span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="progress" 
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Add New Client</span>
              </div>
              <span className="text-orange-500">+</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Record Deal</span>
              </div>
              <span className="text-orange-500">+</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Schedule Meeting</span>
              </div>
              <span className="text-orange-500">+</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentDashboard;