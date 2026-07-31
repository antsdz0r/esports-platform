import { type ReactNode, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedBackground } from "../ui/AnimatedBackground";

const guestNav = [
  { to: "/pro",               label: "Pro mečevi",    icon: "📺" },
  { to: "/pro/turniri",       label: "Turniri",       icon: "◈" },
  { to: "/guest/tournaments", label: "Zajednica",     icon: "◆" },
  { to: "/guest/games",       label: "Katalog igara", icon: "🎮" },
];

export function GuestLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 76 : 232;
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("theme") === "light" ? "light" : "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-deep)", position: "relative" }}>
      <AnimatedBackground particles={42} />

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flexShrink: 0, position: "sticky", top: 0, height: "100vh", zIndex: 20,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border)",
          background: "var(--panel-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}
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
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)" }}>👁 GOST</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {guestNav.map((item, i) => (
            <motion.div key={item.to} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
              <NavLink to={item.to}
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

        {/* Guest CTA */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!collapsed && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 4 }}>
              👁 Gost mod
            </p>
          )}
          <button
            onClick={() => navigate("/login")}
            style={{
              width: "100%", padding: collapsed ? "9px 0" : "9px 0", borderRadius: 9, cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: collapsed ? 13 : 12, fontWeight: 700, letterSpacing: "0.06em",
              border: "1px solid rgba(124,92,255,0.45)", background: "rgba(124,92,255,0.12)", color: "var(--violet2)",
              transition: "all 0.2s",
            }}
            title="Prijavi se"
          >
            {collapsed ? "→" : "Prijavi se"}
          </button>
          {!collapsed && (
            <button
              onClick={() => navigate("/register")}
              style={{
                width: "100%", padding: "9px 0", borderRadius: 9, cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
                border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              Registruj se
            </button>
          )}
          <button
            onClick={() => {
              document.documentElement.setAttribute("data-theme", theme === "dark" ? "light" : "dark");
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              localStorage.setItem("theme", next);
            }}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, padding: "4px 0", transition: "color 0.2s" }}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(255,196,68,0.3)", background: "rgba(255,196,68,0.07)" }}>
              👁 Gost
            </span>
            <button onClick={() => navigate("/login")}
              style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", padding: "6px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(124,92,255,0.45)", background: "rgba(124,92,255,0.12)", color: "var(--violet2)", transition: "all 0.2s" }}>
              Prijavi se →
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 40px" }} className="pg-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
