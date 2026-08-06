import { motion } from "framer-motion";
import { fadeUp } from "../ui/motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { useNotifications } from "../../contexts/notifications/NotificationsProvider";
import type { ProMatch, ProMatchStatus } from "../../models/pro/ProTypes";

const STATUS_META: Record<ProMatchStatus, { label: string; color: string; bg: string }> = {
  live: { label: "LIVE", color: "var(--pink)", bg: "rgba(255,45,126,0.14)" },
  upcoming: { label: "SOON", color: "var(--cyan)", bg: "rgba(0,212,255,0.12)" },
  finished: { label: "FINISHED", color: "var(--green)", bg: "rgba(0,240,160,0.12)" },
  canceled: { label: "CANCELED", color: "var(--text-dim)", bg: "rgba(255,255,255,0.05)" },
};

const CARD_BG = "linear-gradient(165deg, rgba(34,44,82,0.72), rgba(15,19,40,0.9))";
const CARD_BORDER = "1px solid rgba(78,120,210,0.38)";

function TeamCol({ name, logo, won, align }: { name: string | null; logo: string | null; won: boolean; align: "left" | "right" }) {
  const initials = (name ?? "?").slice(0, 3).toUpperCase();
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {logo ? (
        <img src={logo} alt={name ?? ""} style={{ width: 46, height: 46, objectFit: "contain" }} />
      ) : (
        <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text-dim)" }}>{initials}</div>
      )}
      <span style={{ maxWidth: "100%", fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won ? 800 : 600, color: won ? "var(--text)" : "var(--text-muted)", textAlign: align === "right" ? "right" : "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name ?? "TBD"}
      </span>
    </div>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "var(--cyan)" : "none"}
      stroke={active ? "var(--cyan)" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function ProMatchCard({ m, gameLabel, onOpen }: { m: ProMatch; gameLabel: string; onOpen: () => void }) {
  const { user } = useAuth();
  const { isWatched, toggleWatch } = useNotifications();
  const st = STATUS_META[m.status];
  const won1 = m.status === "finished" && m.team1Score > m.team2Score;
  const won2 = m.status === "finished" && m.team2Score > m.team1Score;
  const when = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  // Zvonce: za upcoming (dodavanje) i za bilo koji vec watchlist-ovan mec (uklanjanje).
  const showBell = !!user && (m.status === "upcoming" || isWatched(m.id));

  return (
    <motion.div variants={fadeUp}
      whileHover={{ scale: 1.02, y: -3, boxShadow: "0 14px 40px rgba(0,212,255,0.22)" }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onClick={onOpen}
      style={{ position: "relative", display: "flex", flexDirection: "column", borderRadius: 16, padding: 16, cursor: "pointer", background: CARD_BG, border: CARD_BORDER }}>

      {showBell && (
        <button onClick={(e) => { e.stopPropagation(); toggleWatch(m.id); }}
          title={isWatched(m.id) ? "Remove reminder" : "Notify me when it starts"}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            background: isWatched(m.id) ? "rgba(0,212,255,0.18)" : "rgba(0,0,0,0.32)",
            border: isWatched(m.id) ? "1px solid var(--cyan)" : "1px solid var(--border)",
            borderRadius: 8, cursor: "pointer", padding: 0 }}>
          <BellIcon active={isWatched(m.id)} />
        </button>
      )}

      {/* Top meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {m.status === "live" && <span className="pg-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />}
          {st.label}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--cyan)", padding: "2px 8px", borderRadius: 6, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.30)" }}>
          {gameLabel}
        </span>
      </div>

      {/* League */}
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.leagueName ?? m.serieName ?? ""}{m.tournamentName ? ` · ${m.tournamentName}` : ""}
      </div>

      {/* Datum i vreme */}
      {when && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em", color: "var(--cyan)", background: "rgba(0,212,255,0.09)", border: "1px solid rgba(0,212,255,0.28)", padding: "4px 11px", borderRadius: 8 }}>
            <span style={{ fontSize: 13 }}>🕐</span>{when}
          </span>
        </div>
      )}

      {/* Teams: A  score  B */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
        <TeamCol name={m.team1Name} logo={m.team1Logo} won={won1} align="left" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 8, minWidth: 56 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>
            {m.team1Score}<span style={{ color: "var(--text-dim)", margin: "0 4px" }}>:</span>{m.team2Score}
          </span>
          {m.bestOf ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)" }}>BO{m.bestOf}</span> : null}
        </div>
        <TeamCol name={m.team2Name} logo={m.team2Logo} won={won2} align="right" />
      </div>

      {/* WATCH bar */}
      <div style={{ marginTop: 16, textAlign: "center", padding: "9px 0", borderRadius: 10, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", color: "var(--cyan)", background: "rgba(0,212,255,0.08)", border: "1.5px solid var(--cyan)", boxShadow: "0 0 14px rgba(0,212,255,0.25)" }}>
        WATCH
      </div>
    </motion.div>
  );
}
