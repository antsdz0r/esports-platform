import { type ReactNode, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { AnimatedBackground } from "../ui/AnimatedBackground";

const userNav = [
  { to: "/dashboard",             label: "Dashboard",  icon: "⬡" },
  { to: "/dashboard/teams",       label: "Timovi",     icon: "◎" },
  { to: "/dashboard/tournaments", label: "Turniri",    icon: "◈" },
  { to: "/dashboard/invites",     label: "Pozivnice",  icon: "✉" },
  { to: "/dashboard/watchlist",   label: "Watchlist",  icon: "★" },
];
const adminNav = [
  { to: "/admin",        label: "Dashboard", icon: "⬡" },
  { to: "/admin/users",  label: "Korisnici", icon: "◎" },
  { to: "/admin/audit",  label: "Audit Log", icon: "◈" },
  { to: "/admin/health", label: "Health",    icon: "♥" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeDashboard = location.pathname === "/dashboard";
  const [collapsed, setCollapsed] = useState(false);
  const nav = user?.role === "admin" ? adminNav : userNav;
  const W = collapsed ? 76 : 232;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-deep)", position: "relative" }}>
      <AnimatedBackground particles={14} />

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ flexShrink: 0, position: "sticky", top: 0, height: "100vh", zIndex: 20,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border)",
          background: "rgba(9,11,26,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div style={{ padding: collapsed ? "0 18px" : "0 20px", height: 68, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, filter: "drop-shadow(0 0 8px var(--glow-violet))" }}>
            <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke="var(--violet)" strokeWidth="1.6" />
            <polygon points="16,7 24,11.5 24,20.5 16,25 8,20.5 8,11.5" fill="rgba(124,92,255,0.14)" stroke="var(--cyan)" strokeWidth="0.9" />
            <circle cx="16" cy="16" r="3" fill="var(--violet)" />
          </svg>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, letterSpacing: "0.08em", color: "var(--text)" }}>
                  PULSE<span style={{ color: "var(--violet2)" }}>GRID</span>
                </p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-dim)" }}>{user?.role} panel</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map((item, i) => (
            <motion.div key={item.to} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <NavLink to={item.to} end
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 13, padding: "11px 13px", borderRadius: 9,
                  fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, letterSpacing: "0.04em",
                  transition: "all 0.2s", textDecoration: "none", position: "relative", overflow: "hidden",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "linear-gradient(120deg, rgba(124,92,255,0.18), rgba(0,229,255,0.06))" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                  border: isActive ? "1px solid rgba(124,92,255,0.3)" : "1px solid transparent",
                  boxShadow: isActive ? "0 0 18px rgba(124,92,255,0.18)" : "none",
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: 3, background: "linear-gradient(var(--violet),var(--cyan))" }} />}
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
                    {!collapsed && item.label}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed((c) => !c)}
          style={{ margin: "0 12px 8px", padding: "8px", borderRadius: 8, background: "rgba(124,92,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12, transition: "all 0.2s" }}>
          {collapsed ? "»" : "« Skupi"}
        </button>

        {/* User */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,92,255,0.25), rgba(0,229,255,0.15))", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--violet2)" }}>{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => { logout(); navigate("/login"); }}
              style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", background: "transparent", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}>
              Odjava →
            </button>
          )}
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "auto", position: "relative", zIndex: 2 }}>
        {/* Top bar */}
        <div style={{ height: 68, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(9,11,26,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} className="pg-dot-pulse" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>System Online</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--text-soft)" }}>{user?.username}</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--violet), var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px var(--glow-violet)" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: "#fff" }}>{user?.username?.[0]?.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: isHomeDashboard ? "100%" : 1240,
            margin: "0 auto",
            padding: isHomeDashboard ? 0 : "32px 40px",
          }}
          className={isHomeDashboard ? undefined : "pg-fade-up"}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
