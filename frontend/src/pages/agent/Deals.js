// pages/agent/Deals.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  Search, 
  Download,
  BarChart3,
  Kanban,
  Table,
  Upload,
  FileText,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { dealsAPI, clientsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Deals = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    minValue: '',
    maxValue: ''
  });


  useEffect(() => {
    loadDeals();
    loadStats();
  }, [filters]);

  // Load clients when opening the create modal so dropdown has data
  useEffect(() => {
    if (showCreateModal) {
      loadClients();
    }
  }, [showCreateModal]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        agentId: user.role === 'agent' ? (user?._id || user?.id) : undefined,
        search: filters.search,
        stage: filters.stage,
        minValue: filters.minValue,
        maxValue: filters.maxValue
      };

      const response = await dealsAPI.getAll(params);
      setDeals(response.data?.deals || response.data || []);
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Failed to load deals');
      setDeals([]);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async (search = '') => {
    try {
      const response = await clientsAPI.getAll({ search, limit: 50 });
      setClients(response.data?.clients || response.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setClients([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await dealsAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(null);
    }
  };

  const handleCreateDeal = async (dealData) => {
    try {
      setError(null);
      await dealsAPI.create(dealData);
      setShowCreateModal(false);
      toast.success('Deal created successfully');
      loadDeals();
      loadStats();
    } catch (err) {
      console.error('Error creating deal:', err);
      const message = err.response?.data?.message || err.message || 'Failed to create deal';
      setError(message);
      toast.error(message);
    }
  };

  const handleUpdateDealStage = async (dealId, newStage) => {
    try {
      await dealsAPI.update(dealId, { stage: newStage });
      toast.success('Deal updated successfully');
      loadDeals();
      loadStats();
    } catch (err) {
      console.error('Error updating deal:', err);
      toast.error('Failed to update deal');
    }
  };

  const handleDeleteDeal = async (dealId) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        await dealsAPI.delete(dealId);
        toast.success('Deal deleted successfully');
        loadDeals();
        loadStats();
      } catch (err) {
        console.error('Error deleting deal:', err);
        toast.error('Failed to delete deal');
      }
    }
  };

  // Calculate stats from deals if API stats are not available
  const calculatedStats = React.useMemo(() => {
    if (stats) {
      return stats;
    }
    
    const stageStats = [
      { _id: 'lead', count: 0, totalValue: 0, avgProbability: 0 },
      { _id: 'qualification', count: 0, totalValue: 0, avgProbability: 0 },
      { _id: 'proposal', count: 0, totalValue: 0, avgProbability: 0 },
      { _id: 'negotiation', count: 0, totalValue: 0, avgProbability: 0 },
      { _id: 'won', count: 0, totalValue: 0, avgProbability: 0 },
      { _id: 'lost', count: 0, totalValue: 0, avgProbability: 0 }
    ];

    let totalValue = 0;
    let wonValue = 0;
    let lostValue = 0;

    deals.forEach(deal => {
      const stageIndex = stageStats.findIndex(s => s._id === deal.stage);
      if (stageIndex !== -1) {
        stageStats[stageIndex].count++;
        stageStats[stageIndex].totalValue += deal.value || 0;
        stageStats[stageIndex].avgProbability = Math.round(
          stageStats[stageIndex].totalValue / stageStats[stageIndex].count
        );
      }
      
      totalValue += deal.value || 0;
      if (deal.stage === 'won') wonValue += deal.value || 0;
      if (deal.stage === 'lost') lostValue += deal.value || 0;
    });

    return {
      stageStats,
      totalStats: {
        totalDeals: deals.length,
        totalValue,
        wonValue,
        lostValue,
        // winRate as percentage with one decimal
        winRate: totalValue > 0 ? parseFloat(((wonValue / totalValue) * 100).toFixed(1)) : 0
      }
    };
  }, [stats, deals]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600 mt-1">Track your sales pipeline and deal progress</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Create New Deal
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">Total Value</h3>
          <p className="text-2xl font-bold text-orange-500">
            ${calculatedStats.totalStats?.totalValue?.toLocaleString() || '0'}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">Won Deals</h3>
          <p className="text-2xl font-bold text-green-500">
            ${calculatedStats.totalStats?.wonValue?.toLocaleString() || '0'}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">Pipeline</h3>
          <p className="text-2xl font-bold text-blue-500">
            {calculatedStats.totalStats?.totalDeals || '0'}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900">Win Rate</h3>
          <p className="text-2xl font-bold text-purple-500">
            {calculatedStats?.totalStats?.winRate || 0}%
          </p>
        </motion.div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search deals..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={filters.stage}
              onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Stages</option>
              <option value="lead">Lead</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>

            {/* Probability filter removed as requested */}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('table')}
              className={`p-2 rounded-lg ${view === 'table' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
            >
              <Table size={20} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-lg ${view === 'kanban' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
            >
              <Kanban size={20} />
            </button>
            <button
              onClick={() => setView('charts')}
              className={`p-2 rounded-lg ${view === 'charts' ? 'bg-orange-100 text-orange-500' : 'text-gray-500'}`}
            >
              <BarChart3 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content View */}
      {view === 'table' && (
        <>
          <DealsTableView deals={deals} onUpdateStage={handleUpdateDealStage} onDeleteDeal={handleDeleteDeal} />
          {/* Charts below the table (actual data) */}
          <div className="pt-6">
            <DealsChartsView stats={calculatedStats} />
          </div>
        </>
      )}
      {view === 'kanban' && <DealsKanbanView deals={deals} onUpdateStage={handleUpdateDealStage} />}
      {view === 'charts' && <DealsChartsView stats={calculatedStats} />}

      {/* Create Deal Modal */}
      {showCreateModal && (
        <CreateDealModal 
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateDeal}
          clients={clients}
          onClientSearch={loadClients}
          error={error}
        />
      )}
    </div>
  );
};

// Table View Component
const DealsTableView = ({ deals, onUpdateStage, onDeleteDeal }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deals.map((deal) => (
              <tr key={deal._id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{deal.title}</div>
                  <div className="text-sm text-gray-500">{deal.description?.substring(0, 50)}...</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{deal.client?.name || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">${(deal.value || 0).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={deal.stage}
                    onChange={(e) => onUpdateStage(deal._id, e.target.value)}
                    className="text-xs font-medium px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="lead">Lead</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${deal.probability || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{deal.probability || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onDeleteDeal(deal._id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No deals found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Kanban View Component
const DealsKanbanView = ({ deals, onUpdateStage }) => {
  const stages = ['lead', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
      {stages.map(stage => (
        <div key={stage} className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-4 capitalize">{stage}</h3>
          <div className="space-y-3">
            {deals.filter(d => d.stage === stage).map(deal => (
              <div key={deal._id} className="bg-white rounded-lg p-3 shadow-sm">
                <p className="font-medium text-sm text-gray-900">{deal.title}</p>
                <p className="text-xs text-gray-600">${(deal.value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Charts View Component
const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7a45', '#a28fd0', '#f87171'];

const DealsChartsView = ({ stats }) => {
  const pieData = (stats?.stageStats || []).map(s => ({ name: s._id, value: s.count }));
  const barData = (stats?.stageStats || []).map(s => ({ stage: s._id, value: s.totalValue || 0 }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Statistics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Win Rate</h4>
          <div className="text-3xl font-bold text-purple-600">
            {stats?.totalStats?.winRate ?? 0}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {stats?.totalStats?.wonValue ? `Won: $${(stats.totalStats.wonValue).toLocaleString()}` : 'No won deals yet'}
          </div>
        </div>

        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Deals by Stage (count)</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Total Value by Stage</h4>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Bar dataKey="value" fill="#ff7a45" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Deal Modal Component
const CreateDealModal = ({ onClose, onSubmit, clients, onClientSearch, error }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    client: '',
    agent: user?._id || user?.id || '',
    stage: 'lead',
    probability: 0,
    expectedCloseDate: '',
  });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (clientSearch) {
      const delayDebounceFn = setTimeout(() => {
        onClientSearch(clientSearch);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [clientSearch, onClientSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.value || !formData.client || !formData.agent) {
      setFormError('Please fill in all required fields: Title, Value, Client, and Agent');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability) || 0,
        expectedCloseDate: formData.expectedCloseDate || null
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleClientSelect = (client) => {
    setFormData(prev => ({ ...prev, client: client._id }));
    setClientSearch(client.name || client.companyName);
    setShowClientDropdown(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Deal</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {(error || formError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{formError || error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deal Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter deal title"
              />
            </div>
            
            {/* Deal Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Value *
              </label>
              <input
                type="number"
                required
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="0.00"
              />
            </div>
            
            {/* Client Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Search for client..."
                />
                
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clients.length > 0 ? (
                      clients.map((client) => (
                        <div
                          key={client._id}
                          onClick={() => handleClientSelect(client)}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {client.companyName || client.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {client.email} • {client.phone}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        {clientSearch ? 'No clients found' : 'Start typing to search clients'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="lead">Lead</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
              </select>
            </div>
            
            {/* Probability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            {/* Expected Close Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Close Date
              </label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Describe the deal..."
            />
          </div>
          
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Create Deal
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Deals;