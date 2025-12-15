import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Palette, Bell, Shield, Lock, FileText, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [adminData, setAdminData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [themeSettings, setThemeSettings] = useState({
    theme: localStorage.getItem('theme') || 'light'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    loginAlerts: true,
    approvalNotifications: true,
    errorAlerts: true,
    creditAlerts: true,
    lowStockAlerts: true,
    notificationRecipients: 'admin-only'
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    passwordComplexity: true,
    sessionTimeout: 30,
    loginAttemptLimit: 5,
    ipRestriction: false,
    restrictedIPs: ''
  });

  const [complianceSettings, setComplianceSettings] = useState({
    termsVersion: '1.0',
    privacyVersion: '1.0',
    userConsentRequired: true,
    gdprCompliant: true,
    dataRetentionDays: 365
  });

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: 'Login', user: 'Admin', timestamp: new Date(Date.now() - 3600000), details: 'Successful login' },
    { id: 2, action: 'Settings Update', user: 'Admin', timestamp: new Date(Date.now() - 7200000), details: 'Updated theme settings' },
    { id: 3, action: 'User Creation', user: 'Admin', timestamp: new Date(Date.now() - 86400000), details: 'Created new agent account' }
  ]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'compliance', label: 'Legal & Compliance', icon: FileText }
  ];

  const handleSaveProfile = async () => {
    if (!adminData.email) {
      toast.error('Email is required');
      return;
    }
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSaving(true);
      const updateData = { name: adminData.name, email: adminData.email };
      if (passwordData.newPassword) {
        updateData.currentPassword = passwordData.currentPassword;
        updateData.newPassword = passwordData.newPassword;
      }
      
      // Uncomment when API is ready
      // await usersAPI.update(user._id, updateData);
      
      toast.success('Profile updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (theme) => {
    setThemeSettings({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    toast.success(`Switched to ${theme} theme`);
  };

  const handleSaveSettings = (section) => {
    toast.success(`${section} settings saved successfully!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-8 px-6 min-w-min">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Admin Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={adminData.name}
                      onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={adminData.email}
                      onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-gray-900">Theme Preferences</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Choose Theme
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { id: 'light', name: 'Light', bg: 'bg-white', border: 'border-gray-300' },
                    { id: 'dark', name: 'Dark', bg: 'bg-gray-900', border: 'border-gray-700' }
                  ].map((themeOption) => (
                    <motion.div
                      key={themeOption.id}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        themeSettings.theme === themeOption.id
                          ? 'border-orange-500 ring-2 ring-orange-200'
                          : `border-${themeOption.border}`
                      }`}
                    >
                      <div className={`w-full h-20 rounded ${themeOption.bg} border ${themeOption.border} mb-3`}></div>
                      <p className="font-medium text-gray-900 text-center">{themeOption.name}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Types</h3>
                <div className="space-y-4">
                  {[
                    { key: 'loginAlerts', label: 'Login Alerts', description: 'Get notified on new login attempts' },
                    { key: 'approvalNotifications', label: 'Approval Notifications', description: 'Notify when approvals are required' },
                    { key: 'errorAlerts', label: 'Error Alerts', description: 'Notify on system errors' },
                    { key: 'creditAlerts', label: 'Credit Alerts', description: 'Notify on credit sales activities' },
                    { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Notify on low inventory' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings[key]}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            [key]: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Recipients</h3>
                <div className="space-y-3">
                  {[
                    { value: 'admin-only', label: 'Admin Only', description: 'Only send to admin' },
                    { value: 'admin-agents', label: 'Admin & Agents', description: 'Send to admin and all agents' }
                  ].map(({ value, label, description }) => (
                    <label key={value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="notificationRecipients"
                        value={value}
                        checked={notificationSettings.notificationRecipients === value}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          notificationRecipients: e.target.value
                        })}
                        className="w-4 h-4 text-orange-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={() => handleSaveSettings('Notification')}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Settings</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Password Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="20"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        passwordMinLength: parseInt(e.target.value)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordComplexity}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          passwordComplexity: e.target.checked
                        })}
                        className="w-4 h-4 text-orange-500 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Require complex passwords</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Session & Login Security</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        sessionTimeout: parseInt(e.target.value)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Login Attempt Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={securitySettings.loginAttemptLimit}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        loginAttemptLimit: parseInt(e.target.value)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">IP Access Restrictions</h3>
                <div className="space-y-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.ipRestriction}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        ipRestriction: e.target.checked
                      })}
                      className="w-4 h-4 text-orange-500 rounded"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Enable IP restrictions</span>
                  </label>
                  {securitySettings.ipRestriction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed IP Addresses (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={securitySettings.restrictedIPs}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          restrictedIPs: e.target.value
                        })}
                        placeholder="192.168.1.1, 10.0.0.0/8"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Audit Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Action</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">User</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Timestamp</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-medium">{log.action}</td>
                          <td className="px-4 py-3 text-gray-600">{log.user}</td>
                          <td className="px-4 py-3 text-gray-600">{log.timestamp.toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={() => handleSaveSettings('Security')}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Settings</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Terms & Conditions</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Version
                    </label>
                    <input
                      type="text"
                      value={complianceSettings.termsVersion}
                      onChange={(e) => setComplianceSettings({
                        ...complianceSettings,
                        termsVersion: e.target.value
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Privacy Policy</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Version
                    </label>
                    <input
                      type="text"
                      value={complianceSettings.privacyVersion}
                      onChange={(e) => setComplianceSettings({
                        ...complianceSettings,
                        privacyVersion: e.target.value
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Protection & Compliance</h3>
                <div className="space-y-4">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={complianceSettings.userConsentRequired}
                      onChange={(e) => setComplianceSettings({
                        ...complianceSettings,
                        userConsentRequired: e.target.checked
                      })}
                      className="w-4 h-4 text-orange-500 rounded"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Require User Consent</p>
                      <p className="text-sm text-gray-600">Require explicit consent for terms & privacy policy</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={complianceSettings.gdprCompliant}
                      onChange={(e) => setComplianceSettings({
                        ...complianceSettings,
                        gdprCompliant: e.target.checked
                      })}
                      className="w-4 h-4 text-orange-500 rounded"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">GDPR Compliance</p>
                      <p className="text-sm text-gray-600">Enable GDPR-compliant data handling</p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Retention Period (days)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={complianceSettings.dataRetentionDays}
                      onChange={(e) => setComplianceSettings({
                        ...complianceSettings,
                        dataRetentionDays: parseInt(e.target.value)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <p className="text-xs text-gray-600 mt-2">How long to retain user data before deletion</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={() => handleSaveSettings('Compliance')}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Settings</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;