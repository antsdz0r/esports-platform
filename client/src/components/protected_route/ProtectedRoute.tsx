import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { Layout } from "../layout/Layout";
import { Spinner, PgBtn } from "../ui/UI";
import { AnimatedBackground } from "../ui/AnimatedBackground";

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: string }> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <AnimatedBackground particles={10} />
      <div style={{ position: "relative", zIndex: 3 }}><Spinner size={42} /></div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (user?.role !== requiredRole) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <AnimatedBackground particles={12} />
      <div className="pg-glass" style={{ padding: 40, textAlign: "center", maxWidth: 380, position: "relative", zIndex: 3, border: "1px solid rgba(255,45,126,0.3)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 900, color: "rgba(255,45,126,0.18)", marginBottom: 8 }}>403</div>
        <p style={{ color: "#ff8fb4", fontSize: 14, marginBottom: 20 }}>Nemate dozvolu za pristup ovoj stranici.</p>
        <PgBtn variant="ghost" size="sm" onClick={logout}>Odjava</PgBtn>
      </div>
    </div>
  );

  return <Layout>{children}</Layout>;
};
