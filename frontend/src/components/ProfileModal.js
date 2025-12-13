import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Camera, Lock, Moon, Sun, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, usersAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProfileModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { theme, updateTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageKey, setImageKey] = useState(0);  // Force re-render of image
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Preview image FIRST (show immediately to user)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      console.log('✅ Photo preview set:', reader.result.substring(0, 50) + '...');
    };
    reader.readAsDataURL(file);

    // Then upload in background
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('🔼 Uploading file...', file.name);
      
      // Upload file to backend
      const uploadResponse = await uploadAPI.uploadFile(formData);
      console.log('📤 Upload response:', uploadResponse.data);
      
      const photoUrl = uploadResponse.data.url || uploadResponse.data.path;
      console.log('🖼️ Photo URL from backend:', photoUrl);
      
      if (!photoUrl) {
        throw new Error('No URL returned from upload');
      }
      
      // Update user in database with the photo URL
      console.log('💾 Saving photo URL to database...');
      const updateResponse = await usersAPI.update(user._id || user.id, { 
        profileImage: photoUrl 
      });
      console.log('✅ Database updated:', updateResponse.data.profileImage);
      
      // Update local auth context IMMEDIATELY with the URL from backend
      // This is critical so the UI re-renders with the actual saved URL
      console.log('📍 Updating auth context with photo URL:', photoUrl);
      const updatedUserData = {
        ...user,
        profileImage: photoUrl,
        photo: photoUrl  // Backup field for compatibility
      };
      updateUser(updatedUserData);
      console.log('✅ Auth context updated, user.profileImage is now:', updatedUserData.profileImage);
      
      // Then refresh from backend to ensure sync
      try {
        const meResponse = await authAPI.getMe();
        console.log('🔄 Fresh user data from backend:', meResponse.data.profileImage);
        updateUser(meResponse.data);
      } catch (refreshError) {
        console.warn('⚠️ Could not refresh from backend, using local update:', refreshError.message);
        // Already updated locally above, so continue
      }
      
      // Only clear preview after we have the URL saved
      // This ensures photo stays visible throughout the process
      setTimeout(() => {
        setPhotoPreview(null);
        setImageKey(prev => prev + 1);  // Force re-render of image element
        console.log('✅ Preview cleared, now showing saved image from database');
      }, 500);
      
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      console.error('❌ Error response:', error.response?.data);
      setPhotoPreview(null);  // Clear preview on error
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleThemeToggle = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    updateTheme({ mode: newMode });
    toast.success(`Theme changed to ${newMode} mode`);
  };

  const handleChangePassword = () => {
    onClose();
    navigate('/change-password');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-4 border-orange-500">
                {photoPreview || user?.profileImage || user?.photo ? (
                  <img
                    key={imageKey}
                    src={photoPreview || user.profileImage || user.photo}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.warn('❌ Failed to load image:', e.target.src);
                      // If image fails to load and we have profileImage, log it
                      if (user?.profileImage) {
                        console.log('Image URL that failed:', user.profileImage);
                      }
                    }}
                    onLoad={() => {
                      console.log('✅ Profile image loaded successfully:', photoPreview || user?.profileImage || user?.photo);
                    }}
                  />
                ) : (
                  <User className="w-16 h-16 text-orange-500" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors shadow-lg"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center space-x-1"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-orange-500" />
                <label className="text-sm font-medium text-gray-700">Username</label>
              </div>
              <p className="text-gray-900 font-semibold">{user?.name || 'N/A'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Mail className="w-5 h-5 text-orange-500" />
                <label className="text-sm font-medium text-gray-700">Email</label>
              </div>
              <p className="text-gray-900 font-semibold">{user?.email || 'N/A'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-orange-500" />
                <label className="text-sm font-medium text-gray-700">Role</label>
              </div>
              <p className="text-gray-900 font-semibold capitalize">{user?.role || 'N/A'}</p>
            </div>
          </div>

          {/* Settings Section */}
          <div className="border-t pt-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>

            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {theme.mode === 'light' ? (
                  <Sun className="w-5 h-5 text-orange-500" />
                ) : (
                  <Moon className="w-5 h-5 text-orange-500" />
                )}
                <span className="font-medium text-gray-900">Theme</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 capitalize">{theme.mode}</span>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  theme.mode === 'dark' ? 'bg-orange-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    theme.mode === 'dark' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            </button>

            {/* Change Password */}
            <button
              onClick={handleChangePassword}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900">Change Password</span>
              </div>
              <span className="text-sm text-gray-600">→</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl border-t">
          <button
            onClick={onClose}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

