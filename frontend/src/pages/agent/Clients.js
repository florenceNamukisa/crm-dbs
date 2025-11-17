import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  User, 
  Star, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  Users,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  X,
  Globe,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Clock,
  Award
} from 'lucide-react';
import { clientsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext'; 
import toast from 'react-hot-toast';
import ClientRegistrationForm from './ClientRegistrationForm';

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    tags: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [selectedClients, setSelectedClients] = useState([]);
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(() => {
    loadClients();
  }, [filters, pagination.page, sortConfig]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params = {
        agentId: user.role === 'agent' ? user.id : undefined,
        search: searchTerm,
        status: filters.status,
        priority: filters.priority,
        tags: filters.tags,
        page: pagination.page,
        limit: 12,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      };

      const response = await clientsAPI.getAll(params);
      setClients(response.data.clients || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    setSelectedClients(
      selectedClients.length === clients.length
        ? []
        : clients.map(client => client._id)
    );
  };

  const handleViewProfile = async (clientId) => {
    try {
      const response = await clientsAPI.getById(clientId);
      setSelectedClient(response.data);
      setShowProfileModal(true);
      setActionMenu(null);
    } catch (error) {
      toast.error('Failed to load client profile');
    }
  };

  const handleEditClient = (client) => {
    // For now, we'll show a toast. You can implement a proper edit modal
    toast.success(`Edit client: ${client.name}`);
    setActionMenu(null);
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      try {
        await clientsAPI.delete(clientId);
        toast.success(`Client ${clientName} deleted successfully`);
        if (selectedClient && selectedClient._id === clientId) {
          setShowProfileModal(false);
          setSelectedClient(null);
        }
        loadClients();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete client');
      }
    }
    setActionMenu(null);
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;
    
    const clientNames = clients
      .filter(client => selectedClients.includes(client._id))
      .map(client => client.name)
      .join(', ');

    if (window.confirm(`Are you sure you want to delete ${selectedClients.length} client(s)? This action cannot be undone.\n\nClients: ${clientNames}`)) {
      try {
        await Promise.all(selectedClients.map(id => clientsAPI.delete(id)));
        toast.success(`${selectedClients.length} client(s) deleted successfully`);
        setSelectedClients([]);
        loadClients();
      } catch (error) {
        toast.error('Failed to delete some clients');
      }
    }
  };

  const handleExportClients = async () => {
    try {
      const response = await clientsAPI.exportCSV();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clients.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Clients exported successfully');
    } catch (error) {
      toast.error('Failed to export clients');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      prospect: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      vip: 'bg-purple-100 text-purple-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      prospect: Clock,
      active: CheckCircle,
      vip: Award,
      inactive: AlertCircle
    };
    const IconComponent = icons[status] || User;
    return <IconComponent className="w-4 h-4" />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="w-4 h-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  const ActionMenu = ({ client, onClose }) => (
    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
      <button
        onClick={() => handleViewProfile(client._id)}
        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
      >
        <Eye className="w-4 h-4" />
        <span>View Profile</span>
      </button>
      <button
        onClick={() => handleEditClient(client)}
        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Edit className="w-4 h-4" />
        <span>Edit Client</span>
      </button>
      <button
        onClick={() => handleDeleteClient(client._id, client.name)}
        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>
    </div>
  );

  const ClientProfileModal = ({ client, onClose }) => {
    if (!client) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                <p className="text-gray-600 capitalize">{client.position}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditClient(client)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(client.status)}
                      <span className="text-sm font-medium text-gray-700">Status</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                      {client.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Priority</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(client.priority)}`}>
                      {client.priority}
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <span>Contact Information</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{client.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{client.phone}</span>
                    </div>
                    {client.address && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Information */}
                {client.company && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Building className="w-5 h-5 text-gray-600" />
                      <span>Company Information</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{client.company}</span>
                      </div>
                      {client.position && (
                        <div className="flex items-center space-x-3">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 capitalize">{client.position}</span>
                        </div>
                      )}
                      {client.industry && (
                        <div className="flex items-center space-x-3">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{client.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Additional Info */}
              <div className="space-y-6">
                {/* Engagement Score */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    <span>Engagement Score</span>
                  </h3>
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-full border-4 border-gray-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">{client.engagementScore}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${client.engagementScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">NIN</span>
                      <p className="text-gray-900 font-medium">{client.nin}</p>
                    </div>
                    {client.dateOfBirth && (
                      <div>
                        <span className="text-sm text-gray-600">Date of Birth</span>
                        <p className="text-gray-900 font-medium">
                          {new Date(client.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {client.gender && (
                      <div>
                        <span className="text-sm text-gray-600">Gender</span>
                        <p className="text-gray-900 font-medium capitalize">{client.gender}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-600">Member Since</span>
                      <p className="text-gray-900 font-medium">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Tag className="w-5 h-5 text-gray-600" />
                      <span>Tags</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {client.emergencyContact && client.emergencyContact.name && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span>Emergency Contact</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name</span>
                    <p className="text-gray-900 font-medium">{client.emergencyContact.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Relationship</span>
                    <p className="text-gray-900 font-medium">{client.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone</span>
                    <p className="text-gray-900 font-medium">{client.emergencyContact.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600 mt-1">Manage your client relationships and contacts</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedClients.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedClients.length})</span>
            </button>
          )}
          <button
            onClick={handleExportClients}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">VIP Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter(c => c.status === 'vip').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Engagement</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.length > 0 
                  ? Math.round(clients.reduce((acc, client) => acc + client.engagementScore, 0) / clients.length)
                  : 0
                }%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search clients by name, email, company, or NIN..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadClients()}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Status</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <button
              onClick={loadClients}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>Client</span>
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center space-x-1">
                    <Building className="w-4 h-4" />
                    <span>Company</span>
                    <SortIcon columnKey="company" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>Contact</span>
                    <SortIcon columnKey="email" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Status</span>
                    <SortIcon columnKey="status" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Priority</span>
                    <SortIcon columnKey="priority" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('engagementScore')}
                >
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Engagement</span>
                    <SortIcon columnKey="engagementScore" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created</span>
                    <SortIcon columnKey="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <MoreVertical className="w-4 h-4" />
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <motion.tr
                    key={client._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client._id)}
                        onChange={() => handleSelectClient(client._id)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{client.position}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{client.company || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{client.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(client.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(client.priority)}`}>
                        {client.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${client.engagementScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{client.engagementScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(client.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === client._id ? null : client._id)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenu === client._id && (
                          <ActionMenu 
                            client={client} 
                            onClose={() => setActionMenu(null)}
                          />
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-24 text-center">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {searchTerm || filters.status || filters.priority ? 'No clients found' : 'No clients yet'}
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {searchTerm || filters.status || filters.priority 
                        ? 'Try adjusting your search terms or filters'
                        : 'Get started by adding your first client to the system'
                      }
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Add First Client
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * 12) + 1} to {Math.min(pagination.page * 12, pagination.total)} of {pagination.total} clients
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <ClientRegistrationForm
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadClients();
            toast.success('Client added successfully!');
          }}
        />
      )}

      {/* Client Profile Modal */}
      {showProfileModal && selectedClient && (
        <ClientProfileModal 
          client={selectedClient}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
};

export default Clients;