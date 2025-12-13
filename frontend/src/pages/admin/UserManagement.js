import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, Phone, Edit, Trash2, User, UserPlus, Shield, RefreshCw, UserX } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent',
    nin: ''
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!newUser.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!newUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = 'Email is invalid';
    }

    if (newUser.phone && !/^\+?[\d\s-()]+$/.test(newUser.phone)) {
      errors.phone = 'Phone number is invalid';
    }

    if (newUser.nin && newUser.nin.trim().length < 6) {
      errors.nin = 'NIN looks too short';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setFormLoading(true);
    try {
      const response = await usersAPI.registerAgent(newUser);

      // Show a nicer modal with result and OTP if available
      setSuccessInfo({
        emailSent: response.data.emailSent,
        otp: response.data.otp || null,
        email: newUser.email,
        name: newUser.name
      });
      setShowSuccessModal(true);

      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', role: 'agent', nin: '' });
      setFormErrors({});
      loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to register agent';
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleResendOTP = async (userId, userName) => {
    try {
      const response = await usersAPI.resendOTP(userId);
      toast.success(
        <div>
          <p>OTP resent to {userName}! 📧</p>
          {response.data.otp && (
            <p className="text-sm mt-1">
              <strong>New OTP: {response.data.otp}</strong> (Share this with the agent)
            </p>
          )}
        </div>,
        { duration: 8000 }
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        await usersAPI.delete(userId);
        toast.success(`User ${userName} deleted successfully`);
        loadUsers(); // Refresh the list
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleEditClick = (user) => {
    setEditUser({ ...user });
    setShowEditModal(true);
  };

  const openDeactivateModal = (user) => {
    setDeactivateTarget(user);
    setShowDeactivateModal(true);
  };

  const handleToggleActive = async () => {
    if (!deactivateTarget) return;
    const id = deactivateTarget._id;
    const newActive = deactivateTarget.isActive === false ? true : false;
    try {
      await usersAPI.update(id, { isActive: newActive });
      toast.success(newActive ? 'User activated successfully' : 'User deactivated successfully');
      setShowDeactivateModal(false);
      setDeactivateTarget(null);
      loadUsers();
    } catch (error) {
      console.error('Toggle active error:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const payload = {
        name: editUser.name,
        phone: editUser.phone,
        nin: editUser.nin,
        isActive: editUser.isActive,
        status: editUser.status
      };
      await usersAPI.update(editUser._id, payload);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditUser(null);
      loadUsers();
    } catch (error) {
      console.error('Update user error:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  const UserCard = ({ user, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            user.role === 'admin' ? 'bg-purple-100' : 'bg-orange-100'
          }`}>
            {user.role === 'admin' ? (
              <Shield className="w-6 h-6 text-purple-600" />
            ) : (
              <User className="w-6 h-6 text-orange-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{user.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {user.isActive !== false ? 'Active' : 'Inactive'}
          </span>
          {user.role === 'agent' && user.isFirstLogin && (
            <button 
              onClick={() => handleResendOTP(user._id, user.name)}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="Resend OTP"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => handleEditClick(user)}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            title="Edit User"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeactivateModal(user)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title={user.isActive === false ? 'Activate User' : 'Deactivate User'}
          >
            <UserX className="w-4 h-4" />
          </button>
          {user.role !== 'admin' && (
            <button 
              onClick={() => handleDeleteUser(user._id, user.name)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete User"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span className="truncate">{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{user.phone}</span>
          </div>
        )}
        {user.role === 'agent' && user.isFirstLogin && (
          <div className="flex items-center space-x-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Awaiting first login</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
          {user.performanceScore > 0 && (
            <span>Score: {user.performanceScore}</span>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their access</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Agent</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-sm text-gray-600">Admins</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter(u => u.role === 'agent').length}
          </div>
          <div className="text-sm text-gray-600">Agents</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter(u => u.isFirstLogin).length}
          </div>
          <div className="text-sm text-gray-600">Pending Activation</div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => (
            <UserCard key={user._id} user={user} index={index} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Get started by registering your first agent'
              }
            </p>
            {!searchTerm && user?.role === 'admin' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Register First Agent
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Register New Agent</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    formErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter agent's full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="agent@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    formErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 123-4567"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">National ID (NIN)</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    formErrors.nin ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter national ID number"
                  value={newUser.nin}
                  onChange={(e) => setNewUser({ ...newUser, nin: e.target.value })}
                />
                {formErrors.nin && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nin}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormErrors({});
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <span>Registering...</span>
                  ) : (
                    'Register Agent'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Success Modal after registration */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Agent Registered</h3>
            <p className="mt-2 text-sm text-gray-600">{successInfo.name} ({successInfo.email}) has been created.</p>
            {successInfo.emailSent ? (
              <p className="mt-3 text-sm text-green-600">A welcome email with OTP was sent to the agent.</p>
            ) : (
              <div className="mt-3 text-sm text-yellow-700">
                <p>User created but email failed to send.</p>
                {successInfo.otp && <p className="mt-2 font-mono bg-gray-100 p-2 rounded">OTP: {successInfo.otp}</p>}
                <p className="mt-2 text-xs text-gray-500">Please share the OTP with the agent manually.</p>
              </div>
            )}
            <div className="mt-6 text-right">
              <button onClick={() => setShowSuccessModal(false)} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Close</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NIN</label>
                <input value={editUser.nin || ''} onChange={(e) => setEditUser({ ...editUser, nin: e.target.value })} className="w-full p-3 border rounded-lg" />
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={editUser.isActive !== false} onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })} />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <select value={editUser.status || 'offline'} onChange={(e) => setEditUser({ ...editUser, status: e.target.value })} className="p-2 border rounded">
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditUser(null); }} className="py-2 px-4 border rounded">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-orange-500 text-white rounded">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Deactivate / Activate Confirmation Modal */}
      {showDeactivateModal && deactivateTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">{deactivateTarget.isActive === false ? 'Activate User' : 'Deactivate User'}</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to {deactivateTarget.isActive === false ? 'activate' : 'deactivate'} <strong>{deactivateTarget.name}</strong>?</p>
            <p className="mt-3 text-sm text-gray-500">{deactivateTarget.isActive === false ? 'Activating will allow this agent to access the system again.' : 'Deactivating will immediately prevent this agent from logging in.'}</p>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => { setShowDeactivateModal(false); setDeactivateTarget(null); }} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleToggleActive} className={`px-4 py-2 rounded text-white ${deactivateTarget.isActive === false ? 'bg-green-600' : 'bg-red-600'}`}>
                {deactivateTarget.isActive === false ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;