import { Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ProtectedRoute } from "./components/protected_route/ProtectedRoute";
import { GuestLayout } from "./components/layout/GuestLayout";
import GuestTournamentsPage from "./pages/guest/GuestTournamentsPage";
import GuestGamesPage from "./pages/guest/GuestGamesPage";
import ProPage from "./pages/pro/ProPage";

import LoginPage    from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import NotFoundPage from "./pages/not_found/NotFoundPage";

import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import GamesPage from "./pages/admin/GamesPage";
import TournamentsAdminPage from "./pages/admin/TournamentsAdminPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import HealthPage from "./pages/admin/HealthPage";

import TournamentsPage from "./pages/user/TournamentsPage";
import TournamentDetailPage from "./pages/user/TournamentDetailPage";
import TeamPage from "./pages/user/TeamPage";
import InvitesPage from "./pages/user/InvitesPage";
import WatchlistPage from "./pages/user/WatchlistPage";

export default function App() {
  return (
    <MotionConfig reducedMotion="never">
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />


      {/* User routes */}
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="player"><UserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/teams" element={<ProtectedRoute requiredRole="player"><TeamPage /></ProtectedRoute>} />
      <Route path="/dashboard/tournaments" element={<ProtectedRoute requiredRole="player"><TournamentsPage /></ProtectedRoute>} />
      <Route path="/dashboard/tournaments/:id" element={<ProtectedRoute requiredRole="player"><TournamentDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard/invites" element={<ProtectedRoute requiredRole="player"><InvitesPage /></ProtectedRoute>} />
      <Route path="/dashboard/watchlist" element={<ProtectedRoute requiredRole="player"><WatchlistPage /></ProtectedRoute>} />
      <Route path="/dashboard/pro" element={<ProtectedRoute requiredRole="player"><ProPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin"                element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/games"          element={<ProtectedRoute requiredRole="admin"><GamesPage /></ProtectedRoute>} />
      <Route path="/admin/tournaments"    element={<ProtectedRoute requiredRole="admin"><TournamentsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/audit"          element={<ProtectedRoute requiredRole="admin"><AuditLogPage /></ProtectedRoute>} />
      <Route path="/admin/health"         element={<ProtectedRoute requiredRole="admin"><HealthPage /></ProtectedRoute>} />
      <Route path="/admin/tournaments/:id" element={<ProtectedRoute requiredRole="admin"><TournamentDetailPage isAdmin /></ProtectedRoute>} />
      <Route path="/admin/pro" element={<ProtectedRoute requiredRole="admin"><ProPage /></ProtectedRoute>} />

      {/* Public */}
      <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
      <Route path="/pro" element={<GuestLayout><ProPage /></GuestLayout>} />

      {/* Guest routes */}
      <Route path="/guest" element={<Navigate to="/guest/tournaments" replace />} />
      <Route path="/guest/tournaments" element={<GuestLayout><GuestTournamentsPage /></GuestLayout>} />
      <Route path="/guest/tournaments/:id" element={<GuestLayout><TournamentDetailPage /></GuestLayout>} />
      <Route path="/guest/games" element={<GuestLayout><GuestGamesPage /></GuestLayout>} />

      <Route path="/"    element={<Navigate to="/login" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*"    element={<Navigate to="/404" replace />} />
    </Routes>
    </MotionConfig>
  );
}
