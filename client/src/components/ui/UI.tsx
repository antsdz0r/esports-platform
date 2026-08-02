import { type ReactNode, type MouseEvent, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

/* 
   Spinner
*/
export function Spinner({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent, var(--violet), var(--cyan))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

/*
   Empty / Error / Success*/
export function Empty({ message = "No data" }: { message?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(124,92,255,0.06)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-dim)", fontSize: 22 }}>◦</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-ui)", letterSpacing: "0.06em" }}>{message}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: "1px solid rgba(255,45,126,0.35)", background: "rgba(255,45,126,0.08)", color: "#ff8fb4", fontSize: 13, padding: "12px 16px", borderRadius: 8, marginBottom: 16, boxShadow: "0 0 20px rgba(255,45,126,0.12)" }}>
      {message}
    </motion.div>
  );
}

export function SuccessBox({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: "1px solid rgba(0,240,160,0.35)", background: "rgba(0,240,160,0.08)", color: "var(--green)", fontSize: 13, padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
      {message}
    </motion.div>
  );
}

/* 
   Badges
   */
const STATUS_MAP: Record<string, { c: string; g: string }> = {
  pending:      { c: "var(--gold)",  g: "rgba(255,196,68,0.18)" },
  active:       { c: "var(--cyan)",  g: "rgba(0,229,255,0.16)" },
  open:         { c: "var(--green)", g: "rgba(0,240,160,0.14)" },
  completed:    { c: "var(--green)", g: "rgba(0,240,160,0.14)" },
  ongoing:      { c: "var(--violet2)", g: "rgba(124,92,255,0.18)" },
  cancelled:    { c: "var(--pink)",  g: "rgba(255,45,126,0.16)" },
  confirmed:    { c: "var(--green)", g: "rgba(0,240,160,0.14)" },
  disqualified: { c: "var(--pink)",  g: "rgba(255,45,126,0.16)" },
};
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { c: "var(--text-muted)", g: "rgba(124,92,255,0.12)" };
  const live = status === "ongoing" || status === "active";
  return (
    <span className="pg-badge" style={{ background: s.g, color: s.c, border: `1px solid ${s.c}33` }}>
      <span className={`pg-badge__dot ${live ? "pg-dot-pulse" : ""}`} style={{ background: s.c, boxShadow: `0 0 6px ${s.c}` }} />
      {status}
    </span>
  );
}

const NODE_MAP: Record<string, { c: string; g: string; icon: string }> = {
  healthy:     { c: "var(--green)", g: "rgba(0,240,160,0.1)",  icon: "✅" },
  degraded:    { c: "var(--gold)",  g: "rgba(255,196,68,0.1)", icon: "⚠️" },
  unreachable: { c: "var(--pink)",  g: "rgba(255,45,126,0.1)", icon: "❌" },
  offline:     { c: "var(--pink)",  g: "rgba(255,45,126,0.1)", icon: "❌" },
};
export function NodeBadge({ status }: { status: string }) {
  const s = NODE_MAP[status] ?? NODE_MAP.offline;
  return (
    <span className="pg-badge" style={{ background: s.g, color: s.c, border: `1px solid ${s.c}33` }}>
      {s.icon} {status.toUpperCase()}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const admin = role === "admin";
  const c = admin ? "var(--pink)" : "var(--violet2)";
  return (
    <span className="pg-badge" style={{ background: `${c}1a`, color: c, border: `1px solid ${c}40` }}>
      {admin ? "⭐" : "🎮"} {role}
    </span>
  );
}

/* 
   Pagination
   */
export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 7, background: "rgba(124,92,255,0.05)",
    color: "var(--text-soft)", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, transition: "all 0.2s",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, justifyContent: "center" }}>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} style={btn(page <= 1)}>← Previous</button>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--violet2)" }}>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} style={btn(page >= totalPages)}>Next →</button>
    </div>
  );
}

/* 
   Animated number counter
    */
export function Counter({ value, duration = 1200, suffix = "", prefix = "" }: { value: number; duration?: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{prefix}{display.toLocaleString("en-US")}{suffix}</span>;
}

/* 
   Stat card (glass + glow)
  */
export function StatCard({ label, value, sub, color, icon }: { label: string; value: ReactNode; sub?: string; color?: string; icon?: string }) {
  const c = color ?? "var(--violet2)";
  return (
    <motion.div whileHover={{ y: -4 }} className="pg-glass"
      style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${c}30, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: c, lineHeight: 1, textShadow: `0 0 24px ${c}55` }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>}
    </motion.div>
  );
}

/*
   Tilt card — 3D pointer tilt + glow follow
   */
export function TiltCard({ children, className, style, glow = "var(--violet)", onClick }: {
  children: ReactNode; className?: string; style?: React.CSSProperties; glow?: string; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, on: false });

  const move = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ rx: (py - 0.5) * -8, ry: (px - 0.5) * 10, gx: px * 100, gy: py * 100, on: true });
  };
  const leave = () => setT({ rx: 0, ry: 0, gx: 50, gy: 50, on: false });

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      onClick={onClick}
      className={`pg-card ${className ?? ""}`}
      style={{
        transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) ${t.on ? "scale(1.03)" : "scale(1)"}`,
        transition: t.on ? "transform 0.08s" : "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <div className="pg-card__topline" />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none", opacity: t.on ? 1 : 0, transition: "opacity 0.3s",
        background: `radial-gradient(400px circle at ${t.gx}% ${t.gy}%, ${glow}22, transparent 60%)` }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/*
   Table (glass)
   */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="pg-glass" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>{children}</table>
    </div>
  );
}
export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(124,92,255,0.04)" }}>
        {columns.map((c) => (
          <th key={c} style={{ textAlign: "left", padding: "13px 18px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

/*
   Page header (glitch title)
   */
export function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
      <div>
        <p className="pg-eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</p>
        <h1 className="pg-glitch" data-text={title} style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, letterSpacing: "0.04em", color: "var(--text)" }}>{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

/* 
   Neon button
   */
export function PgBtn({ children, onClick, variant = "primary", size = "md", disabled, type = "button", full }: {
  children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; variant?: "primary" | "cyan" | "ghost" | "danger"; size?: "sm" | "md"; disabled?: boolean; type?: "button" | "submit"; full?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`pg-btn pg-btn--${variant} ${size === "sm" ? "pg-btn--sm" : ""}`}
      style={full ? { width: "100%" } : undefined}>
      <span className="pg-btn__shine" />
      {children}
    </button>
  );
}

/* 
   Form field
   */
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
