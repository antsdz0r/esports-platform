import { Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ProtectedRoute } from "./components/protected_route/ProtectedRoute";

import LoginPage    from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import NotFoundPage from "./pages/not_found/NotFoundPage";

import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import GamesPage from "./pages/admin/GamesPage";
import TournamentsAdminPage from "./pages/admin/TournamentsAdminPage";

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

      {/* Admin routes */}
      <Route path="/admin"                element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users"          element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/games"          element={<ProtectedRoute requiredRole="admin"><GamesPage /></ProtectedRoute>} />
      <Route path="/admin/tournaments"    element={<ProtectedRoute requiredRole="admin"><TournamentsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/tournaments/:id" element={<ProtectedRoute requiredRole="admin"><TournamentDetailPage isAdmin /></ProtectedRoute>} />

      {/* Public — no login required */}
      <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

      <Route path="/"    element={<Navigate to="/login" replace />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*"    element={<Navigate to="/404" replace />} />
    </Routes>
    </MotionConfig>
  );
}
