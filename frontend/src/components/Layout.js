import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Target,
  Calendar,
  Home,
  PieChart,
  UserPlus,
  Bell,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { 
      path: '/admin', 
      icon: Home, 
      label: 'Dashboard', 
      description: 'Overview & Analytics' 
    },
    { 
      path: '/admin/users', 
      icon: UserPlus, 
      label: 'User Management', 
      description: 'Manage Team Members' 
    },
    { 
      path: '/admin/reports', 
      icon: PieChart, 
      label: 'Reports', 
      description: 'Analytics & Insights' 
    },
    { 
      path: '/admin/settings', 
      icon: Settings, 
      label: 'Settings', 
      description: 'System Configuration' 
    },
  ];

  const agentNavItems = [
    { 
      path: '/agent', 
      icon: Home, 
      label: 'Dashboard', 
      description: 'Performance Overview' 
    },
    { 
      path: '/agent/clients', 
      icon: Users, 
      label: 'Clients', 
      description: 'Manage Contacts' 
    },
    { 
      path: '/agent/deals', 
      icon: Target, 
      label: 'Deals', 
      description: 'Sales Pipeline' 
    },
    { 
      path: '/agent/schedules', 
      icon: Calendar, 
      label: 'Schedules', 
      description: 'Meetings & Calendar' 
    },
  ];

  const navItems = isAdmin ? adminNavItems : agentNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item, isActive, onClick }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
          isActive
            ? 'bg-orange-700 text-white shadow-md'
            : 'text-white hover:bg-orange-500/90'
        }`}
      >
        <div className={`p-2 rounded-lg ${
          isActive
            ? 'bg-orange-800 text-white'
            : 'bg-orange-600/20 text-white'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{item.label}</div>
          <div className="text-xs text-white/90 mt-1">{item.description}</div>
        </div>
        {isActive && (
          <div className="w-2 h-2 bg-white rounded-full"></div>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - Always Visible */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 flex flex-col bg-orange-600 shadow-xl border-r border-orange-700 text-white">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-orange-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">CRM Pro</span>
                <p className="text-xs text-white text-opacity-90 font-medium">
                  {isAdmin ? 'Admin Portal' : 'Sales Portal'}
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-orange-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-800 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name}
                </p>
                <p className="text-sm text-white text-opacity-90 capitalize">
                  {user?.role}
                </p>
                <p className="text-xs text-white text-opacity-80 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-white uppercase tracking-wider text-opacity-90">
                Navigation
              </p>
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={isActive}
                  onClick={() => {}}
                />
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-orange-700 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white text-opacity-90">Status</span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white font-medium">Online</span>
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-orange-700 transition-colors group"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - Shows when toggled */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-orange-600 shadow-xl text-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1 h-0 overflow-y-auto">
                {/* Mobile Header */}
                  <div className="flex items-center h-16 px-6 border-b border-orange-700 bg-orange-600 text-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-white">CRM Pro</span>
                        <p className="text-xs text-white text-opacity-90 font-medium">
                          {isAdmin ? 'Admin Portal' : 'Sales Portal'}
                        </p>
                    </div>
                  </div>
                </div>

                {/* Mobile User Info */}
                <div className="px-6 py-4 border-b border-orange-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-800 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.name}
                      </p>
                      <p className="text-sm text-white text-opacity-90 capitalize">
                        {user?.role}
                      </p>
                      <p className="text-xs text-white text-opacity-80 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="px-4 py-6 space-y-2">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-white uppercase tracking-wider text-opacity-90">
                      Navigation
                    </p>
                  </div>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <NavItem
                        key={item.path}
                        item={item}
                        isActive={isActive}
                        onClick={() => setSidebarOpen(false)}
                      />
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Footer */}
              <div className="border-t border-orange-700 p-6 space-y-4 text-white">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white text-opacity-90">Status</span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-white font-medium">Online</span>
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-white hover:bg-orange-700 transition-colors group"
                >
                  <LogOut className="w-4 h-4 text-white" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              {/* Mobile menu button - Only show on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="ml-4 lg:ml-0">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600">
                  {navItems.find(item => item.path === location.pathname)?.description || 'Welcome to CRM Pro'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;