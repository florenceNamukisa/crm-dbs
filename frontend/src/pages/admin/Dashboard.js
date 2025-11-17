import React from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  const stats = {
    totalSales: 125000,
    totalAgents: 8,
    totalDeals: 45,
    pendingDeals: 12,
    clientsEngaged: 156
  };

  const StatCard = ({ icon: Icon, title, value, change, color = 'orange' }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}! Here's your overview.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title="Total Sales"
          value={stats.totalSales}
          change={12.5}
        />
        <StatCard
          icon={Users}
          title="Total Agents"
          value={stats.totalAgents}
          change={5.2}
        />
        <StatCard
          icon={Target}
          title="Total Deals"
          value={stats.totalDeals}
          change={8.7}
        />
        <StatCard
          icon={TrendingUp}
          title="Pending Deals"
          value={stats.pendingDeals}
          change={-2.1}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">New agent registered</p>
                <p className="text-sm text-gray-600">John Doe joined the team</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 hours ago</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Deal closed</p>
                <p className="text-sm text-gray-600">Acme Corp - $50,000</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">5 hours ago</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors text-left">
            <Users className="w-6 h-6 mb-2" />
            <p className="font-medium">Add Agent</p>
            <p className="text-sm text-orange-500">Register new team member</p>
          </button>
          
          <button className="p-4 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors text-left">
            <TrendingUp className="w-6 h-6 mb-2" />
            <p className="font-medium">View Reports</p>
            <p className="text-sm text-blue-500">Analytics & insights</p>
          </button>
          
          <button className="p-4 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition-colors text-left">
            <DollarSign className="w-6 h-6 mb-2" />
            <p className="font-medium">Sales Overview</p>
            <p className="text-sm text-green-500">Performance metrics</p>
          </button>
          
          <button className="p-4 bg-purple-50 rounded-lg text-purple-600 hover:bg-purple-100 transition-colors text-left">
            <Target className="w-6 h-6 mb-2" />
            <p className="font-medium">Deals</p>
            <p className="text-sm text-purple-500">Manage sales pipeline</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;