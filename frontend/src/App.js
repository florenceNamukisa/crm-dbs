import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AgentDashboard = lazy(() => import('./pages/agent/Dashboard'));
const Clients = lazy(() => import('./pages/agent/Clients'));
const Deals = lazy(() => import('./pages/agent/Deals'));
const Schedules = lazy(() => import('./pages/agent/Schedules'));
const Sales = lazy(() => import('./pages/agent/Sales'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Minimal loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();

  // Use cached user from localStorage for instant rendering
  if (!user) {
    const cachedUser = localStorage.getItem('user');
    if (!cachedUser) {
      return <Navigate to="/login" replace />;
    }
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    const redirectPath = user.role === 'admin' ? '/admin' : '/agent';
    return <Navigate to={redirectPath} replace />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  // Use cached user from localStorage for instant rendering
  if (user) {
    const redirectPath = user.role === 'admin' ? '/admin' : '/agent';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="App min-h-screen bg-gray-50">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                } />
                
                {/* Agent Routes */}
                <Route path="/change-password" element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                } />
                <Route path="/agent" element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <AgentDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/agent/clients" element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="/agent/deals" element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <Deals />
                  </ProtectedRoute>
                } />
                <Route path="/agent/schedules" element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <Schedules />
                  </ProtectedRoute>
                } />
                <Route path="/agent/sales" element={
                  <ProtectedRoute allowedRoles={['agent']}>
                    <Sales />
                  </ProtectedRoute>
                } />
                
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>

            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#fff',
                  color: '#333',
                },
                success: {
                  iconTheme: {
                    primary: '#f97316',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;