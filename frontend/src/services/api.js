import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  changePassword: (data) => api.post('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
  logout: () => {
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
};

// Deals API
export const dealsAPI = {
  getAll: (params = {}) => api.get('/deals', { params }),
  create: (dealData) => api.post('/deals', dealData),
  update: (id, dealData) => api.put(`/deals/${id}`, dealData),
  delete: (id) => api.delete(`/deals/${id}`),
  getById: (id) => api.get(`/deals/${id}`),
  updateStatus: (id, status) => api.patch(`/deals/${id}/status`, { status }),
  getStats: () => api.get('/deals/stats'),
};

// Performance API
export const performanceAPI = {
  getAgentPerformance: (agentId) => api.get(`/performance/agent/${agentId}`),
  getAllPerformance: () => api.get('/performance/overall'),
  getTeamPerformance: () => api.get('/performance/team'),
  getPerformanceStats: () => api.get('/performance/stats'),
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

// Export the main api instance for custom requests
export default api;