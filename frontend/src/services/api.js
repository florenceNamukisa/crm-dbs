import axios from 'axios';

// Simple in-memory cache for API responses
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache

const getCacheKey = (url, params) => {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${url}:${paramStr}`;
};

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};


const API_URL = process.env.REACT_APP_API_URL || 'https://crm-dbs.onrender.com/api';
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    // Return cached response for GET requests if available
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config.url, config.params);
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        return Promise.reject({
          config,
          response: { data: cachedData },
          _fromCache: true
        });
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.url !== '/auth/login' && config.url !== '/auth/me') {
      console.warn('Making API request without authentication token:', config.url);
    }
    return config;
  },
  (error) => {
    // Handle cached responses
    if (error._fromCache) {
      return Promise.resolve(error.response);
    }
    return Promise.reject(error);
  }
);

// Handle token expiration and network errors with improved resilience
api.interceptors.response.use(
  (response) => {
    // Cache GET request responses
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config.url, response.config.params);
      setCache(cacheKey, response.data);
    }
    return response;
  },
  (error) => {
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR' || !error.response;
    const isServerError = error.response?.status >= 500;
    const isAuthEndpoint = error.config?.url?.includes('/auth/');

    if (isAuthError) {
      // For auth endpoints, always handle as auth error
      if (isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        // For other endpoints, check if user might still be logged in
        // Only logout if it's clearly an authentication issue
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          // No token stored, definitely need to login
          window.location.href = '/login';
        } else {
          // Token exists, might be a temporary issue - don't logout immediately
          console.warn('Authentication error but token exists, not logging out');
        }
      }
    } else if (isNetworkError || isServerError) {
      // Network or server errors - don't logout, just log
      console.warn('Network/Server error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Add automatic retry for failed requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Don't retry auth requests or if already retried
    if (config?.url?.includes('/auth/') || config?._retry) {
      return Promise.reject(error);
    }

    // Retry network errors once
    if (error.code === 'ERR_NETWORK' && !config._retry) {
      config._retry = true;
      console.log('Retrying failed request:', config.url);

      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  changePassword: (data) => api.post('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  }
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  registerAgent: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  resendOTP: (id) => api.post(`/users/${id}/resend-otp`),
  getById: (id) => api.get(`/users/${id}`),
};

// Clients API
export const clientsAPI = {
  getAll: (params = {}) => api.get('/clients', { params }),
  create: (clientData) => api.post('/clients', clientData),
  update: (id, clientData) => api.put(`/clients/${id}`, clientData),
  delete: (id) => api.delete(`/clients/${id}`),
  getById: (id) => api.get(`/clients/${id}`),
  exportCSV: () => api.get('/clients/export/csv', { responseType: 'blob' }),
};

// Deals API
export const dealsAPI = {
  getAll: (params = {}) => api.get('/deals', { params }),
  create: (dealData) => api.post('/deals', dealData),
  update: (id, dealData) => api.put(`/deals/${id}`, dealData),
  delete: (id) => api.delete(`/deals/${id}`),
  getById: (id) => api.get(`/deals/${id}`),
  updateStatus: (id, status) => api.patch(`/deals/${id}/status`, { status }),
  getStats: (params = {}) => api.get('/deals/stats', { params }),
};


// Performance API
export const performanceAPI = {
  getAgentPerformance: (agentId) => api.get(`/performance/agent/${agentId}`),
  getAllPerformance: () => api.get('/performance/overall'),
  getTeamPerformance: () => api.get('/performance/team'),
  getPerformanceStats: () => api.get('/performance/stats'),
  getRankings: () => api.get('/performance/rankings'),
};

// Schedules API
export const schedulesAPI = {
  getAll: (params = {}) => api.get('/schedules', { params }),
  create: (scheduleData) => api.post('/schedules', scheduleData),
  update: (id, scheduleData) => api.put(`/schedules/${id}`, scheduleData),
  delete: (id) => api.delete(`/schedules/${id}`),
  getById: (id) => api.get(`/schedules/${id}`),
  getUpcoming: () => api.get('/schedules/upcoming'),
};

// Email API
export const emailAPI = {
  testEmail: () => api.get('/users/test-email'),
  sendWelcomeEmail: (emailData) => api.post('/email/welcome', emailData),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/activity'),
  getChartsData: () => api.get('/dashboard/charts'),
};

// Reports API
export const reportsAPI = {
  generateReport: (reportData) => api.post('/reports/generate', reportData),
  getReportTemplates: () => api.get('/reports/templates'),
  downloadReport: (reportId) => api.get(`/reports/download/${reportId}`, { responseType: 'blob' }),
  share: (payload) => api.post('/reports/share', payload),
  importFile: (formData) => api.post('/reports/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
};

// Sales API
export const salesAPI = {
  getAll: (params = {}) => api.get('/sales', { params }),
  getSummary: (period = 'daily', agent = null) => {
    const params = new URLSearchParams({ period });
    if (agent) params.append('agent', agent);
    return api.get(`/sales/summary?${params.toString()}`);
  },
  getStats: (params = {}) => api.get('/sales/stats', { params }),
  create: (saleData) => api.post('/sales', saleData),
  getById: (id) => api.get(`/sales/${id}`),
  update: (id, saleData) => api.put(`/sales/${id}`, saleData),
  recordPayment: (id, paymentData) => api.post(`/sales/${id}/payment`, paymentData),
  getRecent: (limit = 5) => api.get(`/sales/recent/list?limit=${limit}`)
};

// Stock API
export const stockAPI = {
  getAll: (params = {}) => api.get('/stock', { params }),
  getAlerts: () => api.get('/stock/alerts'),
  create: (stockData) => api.post('/stock', stockData),
  update: (id, stockData) => api.put(`/stock/${id}`, stockData),
  delete: (id) => api.delete(`/stock/${id}`),
  updateStock: (id, quantity, operation) => api.patch(`/stock/${id}/stock`, { quantity, operation }),
  getStats: () => api.get('/stock/stats/overview')
};

// File Upload API
export const uploadAPI = {
  uploadFile: (formData) => api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteFile: (fileId) => api.delete(`/upload/${fileId}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getStats: () => api.get('/notifications/stats/summary')
};

// OTP API
export const otpAPI = {
  sendOTP: (data) => api.post('/otp/send', data),
  verifyOTP: (data) => api.post('/otp/verify', data)
};

// Export the main api instance for custom requests
export default api;