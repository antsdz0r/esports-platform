import { type ReactNode, type CSSProperties, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { AnimatedBackground } from "../ui/AnimatedBackground";
import { NotificationBell } from "../ui/NotificationBell";
import { ProfileModal } from "../ui/ProfileModal";

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

const pgRnd = (i: number, k: number): number => {
  const v = Math.sin((i + 1) * (k + 1) * 12.9898) * 43758.5453;
  return Math.round((v - Math.floor(v) - 0.5) * 2 * 26);
};

const PG_SCATTER: { x: number; y: number; r: number }[] = [
  { x: -300, y: -130, r: -50 },
  { x: 240,  y: -90,  r: 40 },
  { x: -180, y: 140,  r: -30 },
  { x: 320,  y: 60,   r: 55 },
  { x: -260, y: -40,  r: -45 },
  { x: 180,  y: 120,  r: 30 },
  { x: -140, y: -150, r: -25 },
  { x: 280,  y: -120, r: 48 },
  { x: -220, y: 100,  r: -38 },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeDashboard = location.pathname === "/dashboard";
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const nav = user?.role === "admin" ? adminNav : userNav;
  const W = collapsed ? 76 : 232;
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("theme") === "light" ? "light" : "dark"));
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [reveal, setReveal] = useState<null | "dark" | "light">(null);

  const toggleTheme = () => {
    if (reveal) return;
    setReveal(theme === "dark" ? "light" : "dark");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-deep)", position: "relative" }}>
      <AnimatedBackground particles={42} />

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ flexShrink: 0, position: "sticky", top: 0, height: "100vh", zIndex: 20,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border)",
          background: "var(--panel-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
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
            {!collapsed && (
              <button onClick={toggleTheme}
                title={theme === "dark" ? "Pređi na light mode" : "Pređi na dark mode"}
                aria-label="Promeni temu"
                style={{ marginLeft: "auto", position: "relative", width: 62, height: 30, borderRadius: 999, flexShrink: 0, cursor: "pointer", padding: 0, border: "1px solid var(--border-bright)", background: "var(--bg-glass)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
                <span style={{ position: "absolute", left: 8, display: "flex", color: "var(--gold)", opacity: theme === "light" ? 1 : 0.45, transition: "opacity 0.3s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                </span>
                <span style={{ position: "absolute", right: 8, display: "flex", color: "var(--blue)", opacity: theme === "dark" ? 1 : 0.45, transition: "opacity 0.3s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
                </span>
                <motion.span
                  animate={{ x: theme === "dark" ? 34 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  style={{ position: "absolute", top: 2, left: 0, width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.30)", border: "1px solid var(--border-bright)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
                />
              </button>
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
        <div style={{ height: 68, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--topbar-bg)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} className="pg-dot-pulse" />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>System Online</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {user?.role === "player" && <NotificationBell />}
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--text-soft)" }}>{user?.username}</span>
            <button onClick={() => setProfileOpen(true)}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--border-bright)", overflow: "hidden", cursor: "pointer", background: "linear-gradient(135deg, var(--violet), var(--cyan))", flexShrink: 0, padding: 0, transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: "0 0 14px var(--glow-violet)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--violet)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(124,92,255,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-bright)"; e.currentTarget.style.boxShadow = "0 0 14px var(--glow-violet)"; }}>
              {user?.profilePicture ? (
                <img src={(user.profilePicture.startsWith("http") ? user.profilePicture : `${(import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "")}${user.profilePicture}`)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{user?.username?.[0]?.toUpperCase()}</span>
              )}
            </button>
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
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      {reveal && (
        <>
          <motion.div
            key="theme-reveal"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: [0.83, 0, 0.17, 1] }}
            onAnimationComplete={() => {
              setTheme(reveal);
              window.setTimeout(() => setReveal(null), 1800);
            }}
            style={{ position: "fixed", left: "-125vmax", bottom: "-125vmax", width: "250vmax", height: "250vmax", borderRadius: "50%", background: reveal === "light" ? "#eef0f8" : "#05060f", zIndex: 9999, pointerEvents: "none", willChange: "transform" }}
          />
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div className="pulse-final" style={{ display: "inline-block" }}>
            <div style={{ display: "flex", fontFamily: "var(--font-display)", fontSize: "clamp(40px, 9vw, 112px)", fontWeight: 900, letterSpacing: "0.14em", color: reveal === "light" ? "#14172e" : "#eef0ff" }}>
              {"PULSEGRID".split("").map((ch, i) => {
                const sc = PG_SCATTER[i % PG_SCATTER.length];
                return (
                  <motion.span key={i} className="pulse-glitch" data-text={ch}
                    initial={{ opacity: 0, x: sc.x, y: sc.y, rotate: sc.r, scale: 1.35 }}
                    animate={{
                      opacity: [0, 1, 0.2, 1, 0.6, 1],
                      x: [sc.x, sc.x * 0.5, -12, 5, 0, 0],
                      y: [sc.y, sc.y * 0.5, 9, -4, 0, 0],
                      rotate: [sc.r, sc.r * 0.4, 0, 0, 0, 0],
                      scale: [1.35, 1.08, 1, 1, 1, 1],
                    }}
                    transition={{ delay: 0.5 + i * 0.045, duration: 0.8, ease: "easeInOut", times: [0, 0.28, 0.5, 0.72, 0.88, 1] }}
                    style={{ display: "inline-block", position: "relative" }}>
                    <span className="char-burst" data-text={ch} style={{
                      display: "inline-block", position: "relative",
                      "--jx1": `${pgRnd(i, 1)}px`, "--jy1": `${pgRnd(i, 2)}px`,
                      "--jx2": `${pgRnd(i, 3)}px`, "--jy2": `${pgRnd(i, 4)}px`,
                      "--jx3": `${pgRnd(i, 5)}px`, "--jy3": `${pgRnd(i, 6)}px`,
                      "--jx4": `${pgRnd(i, 7)}px`, "--jy4": `${pgRnd(i, 8)}px`,
                      "--jx5": `${pgRnd(i, 9)}px`, "--jy5": `${pgRnd(i, 10)}px`,
                    } as CSSProperties}>{ch}</span>
                  </motion.span>
                );
              })}
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
