import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  User,
  Bell,
  Shield,
  FileText,
  Eye,
  EyeOff,
  Clock,
  XCircle,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { usersAPI, authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  // Profile
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Notifications – only email recipients remains
  const [notificationSettings, setNotificationSettings] = useState({
    emailRecipients: user?.email || "",
  });

  // Security settings – only session/login fields are editable in UI,
  // but we keep password policy fields for profile validation.
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,           // used in profile validation (hidden)
    passwordComplexity: true,        // used in profile validation (hidden)
    sessionTimeout: 30,              // editable
    loginAttemptLimit: 5,            // editable
  });

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      action: "Login",
      user: "Admin",
      timestamp: new Date(Date.now() - 3600000),
      details: "Successful login from 192.168.1.1",
    },
    {
      id: 2,
      action: "Settings Update",
      user: "Admin",
      timestamp: new Date(Date.now() - 7200000),
      details: "Updated notification preferences",
    },
    {
      id: 3,
      action: "Password Change",
      user: "Admin",
      timestamp: new Date(Date.now() - 86400000),
      details: "Password changed successfully",
    },
  ]);

  // Compliance – only terms and privacy versions remain
  const [complianceSettings, setComplianceSettings] = useState({
    termsVersion: "2.1.0",
    privacyVersion: "1.5.2",
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "compliance", label: "Legal & Compliance", icon: FileText },
  ];

  // Password strength indicator
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(passwordData.newPassword);
  const strengthText = ["Very weak", "Weak", "Fair", "Good", "Strong"][
    strength
  ] || "Very weak";

  // Profile save
  const handleSaveProfile = async () => {
    if (!profileData.email) {
      toast.error("Email is required");
      return;
    }

    if (passwordData.newPassword) {
      if (!passwordData.currentPassword) {
        toast.error("Current password is required to set a new password");
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (passwordData.newPassword.length < securitySettings.passwordMinLength) {
        toast.error(`Password must be at least ${securitySettings.passwordMinLength} characters`);
        return;
      }
      if (
        securitySettings.passwordComplexity &&
        !/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(
          passwordData.newPassword
        )
      ) {
        toast.error(
          "Password must include uppercase, lowercase, number, and special character"
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      let profileUpdated = false;
      let passwordUpdated = false;

      if (profileData.name !== user?.name) {
        const userId = user?._id || user?.id;
        if (!userId) throw new Error("Unable to identify current user");
        const profileRes = await usersAPI.update(userId, {
          name: profileData.name,
        });
        updateUser(profileRes.data);
        profileUpdated = true;
      }

      if (passwordData.newPassword) {
        await authAPI.changePassword({
          email: user?.email || profileData.email,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        });
        passwordUpdated = true;
      }

      if (profileUpdated && passwordUpdated) {
        toast.success("Profile and password updated successfully!");
      } else if (passwordUpdated) {
        toast.success("Password changed successfully!");
      } else if (profileUpdated) {
        toast.success("Profile updated successfully!");
      } else {
        toast.success("No changes to save");
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Notifications save (only email recipients)
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      // Replace with your API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Notification settings saved!");
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Security save (only session/login settings)
  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      // Here you would send securitySettings.sessionTimeout and .loginAttemptLimit to your backend
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Security settings saved!");
    } catch (error) {
      toast.error("Failed to save security settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Compliance save (only terms & privacy versions)
  const handleSaveCompliance = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Compliance settings saved!");
    } catch (error) {
      toast.error("Failed to save compliance settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account and system preferences
          </p>
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
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Admin Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Password */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                strength <= 1
                                  ? "bg-red-500"
                                  : strength <= 2
                                  ? "bg-orange-500"
                                  : strength <= 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${(strength / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {strengthText}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordData.confirmPassword &&
                      passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500 flex items-center">
                          <XCircle size={12} className="mr-1" />
                          Passwords do not match
                        </p>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab – only recipients */}
          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Notification Recipients
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses (comma separated)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={notificationSettings.emailRecipients}
                      onChange={(e) =>
                        setNotificationSettings({
                          emailRecipients: e.target.value,
                        })
                      }
                      placeholder="admin@example.com, alerts@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Separate multiple emails with commas. Leave blank to use admin email only.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Security Tab – only Session & Login Security and Audit Logs */}
          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Session & Login Security */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Session & Login Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            sessionTimeout: parseInt(e.target.value),
                          })
                        }
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={securitySettings.loginAttemptLimit}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          loginAttemptLimit: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Recent Audit Logs
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          User
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-900 font-medium">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {log.user}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {log.timestamp.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveSecurity}
                  disabled={isSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? "Saving..." : "Save Security Settings"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Compliance Tab – only Terms & Privacy versions */}
          {activeTab === "compliance" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Terms & Privacy */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Terms & Privacy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms of Service Version
                    </label>
                    <input
                      type="text"
                      value={complianceSettings.termsVersion}
                      onChange={(e) =>
                        setComplianceSettings({
                          ...complianceSettings,
                          termsVersion: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Privacy Policy Version
                    </label>
                    <input
                      type="text"
                      value={complianceSettings.privacyVersion}
                      onChange={(e) =>
                        setComplianceSettings({
                          ...complianceSettings,
                          privacyVersion: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  onClick={handleSaveCompliance}
                  disabled={isSaving}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? "Saving..." : "Save Compliance Settings"}</span>
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