import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { RequireAdmin } from './components/RouteGuards';

import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import Apply from './pages/Apply';
import ClimateIntelligence from './pages/ClimateIntelligence';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import Profile from './pages/Profile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplications from './pages/admin/AdminApplications';
import AdminClimate from './pages/admin/AdminClimate';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDisbursements from './pages/admin/AdminDisbursements';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="apply" element={<Apply />} />
          <Route path="apply/:loanId" element={<Apply />} />
          <Route path="climate-intelligence" element={<ClimateIntelligence />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="auth" element={<Navigate to="/login" replace />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="climate" element={<AdminClimate />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="disbursements" element={<AdminDisbursements />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
