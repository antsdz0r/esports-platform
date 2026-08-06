import { Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ProtectedRoute } from "./components/protected_route/ProtectedRoute";
import { NotificationsProvider } from "./contexts/notifications/NotificationsProvider";
import { GuestLayout } from "./components/layout/GuestLayout";
import ProPage from "./pages/pro/ProPage";
import ProTournamentsPage from "./pages/pro/ProTournamentsPage";
import PickemPage from "./pages/pickem/PickemPage";

import LoginPage    from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import NotFoundPage from "./pages/not_found/NotFoundPage";

import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import HealthPage from "./pages/admin/HealthPage";
import WatchlistPage from "./pages/user/WatchlistPage";
import FavoritesPage from "./pages/user/FavoritesPage";

export default function App() {
  return (
    <MotionConfig reducedMotion="never">
    <NotificationsProvider>
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* User routes */}
      <Route path="/dashboard"              element={<ProtectedRoute requiredRole="player"><UserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/watchlist"    element={<ProtectedRoute requiredRole="player"><WatchlistPage /></ProtectedRoute>} />
      <Route path="/dashboard/favorites"    element={<ProtectedRoute requiredRole="player"><FavoritesPage /></ProtectedRoute>} />
      <Route path="/dashboard/pro"          element={<ProtectedRoute requiredRole="player"><ProPage /></ProtectedRoute>} />
      <Route path="/dashboard/pro-turniri"  element={<ProtectedRoute requiredRole="player"><ProTournamentsPage /></ProtectedRoute>} />
      <Route path="/dashboard/pickem"       element={<ProtectedRoute requiredRole="player"><PickemPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin"             element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"       element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/audit"       element={<ProtectedRoute requiredRole="admin"><AuditLogPage /></ProtectedRoute>} />
      <Route path="/admin/health"      element={<ProtectedRoute requiredRole="admin"><HealthPage /></ProtectedRoute>} />
      <Route path="/admin/favorites"   element={<ProtectedRoute requiredRole="admin"><FavoritesPage /></ProtectedRoute>} />
      <Route path="/admin/pro"         element={<ProtectedRoute requiredRole="admin"><ProPage /></ProtectedRoute>} />
      <Route path="/admin/pro-turniri" element={<ProtectedRoute requiredRole="admin"><ProTournamentsPage /></ProtectedRoute>} />
      <Route path="/admin/pickem"      element={<ProtectedRoute requiredRole="admin"><PickemPage /></ProtectedRoute>} />

      {/* Public / guest */}
      <Route path="/pro"        element={<GuestLayout><ProPage /></GuestLayout>} />
      <Route path="/pro/turniri" element={<GuestLayout><ProTournamentsPage /></GuestLayout>} />

      <Route path="/"    element={<Navigate to="/login" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*"    element={<Navigate to="/404" replace />} />
    </Routes>
    </NotificationsProvider>
    </MotionConfig>
  );
}
