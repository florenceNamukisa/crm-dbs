import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Session persistence and refresh mechanism
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // First try to use stored session without validation
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);

          // Then validate in background (don't block UI)
          try {
            const response = await authAPI.getMe();
            const userData = response.data;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (validationError) {
            // If validation fails, keep the stored session but mark for refresh
            console.warn('Token validation failed, but keeping session for user experience');
          }
        } catch (parseError) {
          console.error('Failed to parse stored user data, clearing session');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    initializeAuth();

    // Set up periodic token refresh (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      if (token && user) {
        try {
          const response = await authAPI.getMe();
          const userData = response.data;
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          // Don't log out on refresh failures, just log the error
          console.warn('Token refresh failed:', error.message);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Online/offline detection for session recovery
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored, validating session...');
      if (token && user) {
        // Revalidate session when coming back online
        authAPI.getMe().then(response => {
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('Session validated successfully');
        }).catch(error => {
          console.warn('Session validation failed after reconnect:', error.message);
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost, preserving session');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData, requiresPasswordChange } = response.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      
      return { 
        success: true, 
        user: userData,
        requiresPasswordChange: requiresPasswordChange || false
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    authAPI.logout().finally(() => {
      setToken(null);
      setUser(null);
    });
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    token,
    isOnline,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};