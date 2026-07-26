import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import StreamEmbed, { type EmbedStream } from "./StreamEmbed";
import ProStreamAdminModal from "./ProStreamAdminModal";
import { PLATFORM_LABELS } from "../../helpers/streamEmbed";
import type { ProMatch, ProMatchStatus } from "../../models/pro/ProTypes";

const STATUS_META: Record<ProMatchStatus, { label: string; color: string; bg: string }> = {
  live: { label: "UŽIVO", color: "var(--pink)", bg: "rgba(255,45,126,0.12)" },
  upcoming: { label: "USKORO", color: "var(--cyan)", bg: "rgba(0,212,255,0.10)" },
  finished: { label: "ZAVRŠENO", color: "var(--green)", bg: "rgba(0,240,160,0.10)" },
  canceled: { label: "OTKAZANO", color: "var(--text-dim)", bg: "rgba(255,255,255,0.04)" },
};

const cap = (s: string) => (s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s);

function toEmbeds(m: ProMatch): EmbedStream[] {
  return m.streams.map((s) => ({
    key: `${s.platform}:${s.channel}`,
    platform: s.platform,
    channel: s.channel,
    label: s.isOfficial ? "Zvanični" : cap(s.channel),
    sub: `${PLATFORM_LABELS[s.platform]} · ${s.language.toUpperCase()}`,
  }));
}

function TeamSide({ name, logo, score, won, align }: { name: string | null; logo: string | null; score: number; won: boolean; align: "left" | "right" }) {
  const initials = (name ?? "?").slice(0, 3).toUpperCase();
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      {logo ? (
        <img src={logo} alt={name ?? ""} style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text-dim)" }}>{initials}</div>
      )}
      <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 16, fontWeight: won ? 800 : 600, color: won ? "var(--text)" : "var(--text-muted)", textAlign: align === "right" ? "right" : "left" }}>
        {name ?? "TBD"}
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: won ? "var(--green)" : "var(--text-dim)" }}>{score}</span>
    </div>
  );
}

export default function ProMatchModal({ match, gameLabel, onClose, isAdmin = false, onStreamsChanged }: {
  match: ProMatch;
  gameLabel: string;
  onClose: () => void;
  isAdmin?: boolean;
  onStreamsChanged?: () => void;
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const st = STATUS_META[match.status];
  const won1 = match.status === "finished" && match.team1Score > match.team2Score;
  const won2 = match.status === "finished" && match.team2Score > match.team1Score;
  const when = match.scheduledAt ? new Date(match.scheduledAt).toLocaleString("sr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.74)", backdropFilter: "blur(6px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="pg-glass"
          style={{ width: "100%", maxWidth: 860, borderRadius: 18, padding: 24, maxHeight: "92vh", overflowY: "auto", border: "1px solid var(--border-bright)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {match.status === "live" && <span className="pg-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />}
              {st.label}
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--violet2)", padding: "2px 8px", borderRadius: 6, background: "rgba(124,92,255,0.10)", border: "1px solid rgba(124,92,255,0.25)" }}>
              {gameLabel}
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>
              {match.leagueName ?? match.serieName ?? ""}{match.tournamentName ? ` · ${match.tournamentName}` : ""}
            </span>
            {when && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-dim)" }}>{when}</span>}
            {isAdmin && (
              <button onClick={() => setAdminOpen(true)}
                style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "rgba(124,92,255,0.12)", border: "1px solid rgba(124,92,255,0.4)", color: "var(--violet2)" }}>
                🎙 Kasteri
              </button>
            )}
            <button onClick={onClose} style={{ marginLeft: isAdmin ? 0 : "auto", background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {/* Teams */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <TeamSide name={match.team1Name} logo={match.team1Logo} score={match.team1Score} won={won1} align="left" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, color: "var(--text-dim)" }}>VS</span>
            <TeamSide name={match.team2Name} logo={match.team2Logo} score={match.team2Score} won={won2} align="right" />
          </div>

          {/* Player + source switcher */}
          <StreamEmbed
            streams={toEmbeds(match)}
            emptyTitle={match.status === "finished" ? "Meč je završen" : match.status === "upcoming" ? "Meč još nije počeo" : undefined}
            emptySub={
              match.status === "finished" ? "Snimak meča nije dostupan preko izvora."
              : match.status === "upcoming" ? "Stream se pojavljuje kada meč krene uživo."
              : undefined
            }
          />
        </motion.div>
      </motion.div>

      {adminOpen && (
        <ProStreamAdminModal
          matchId={match.id}
          onClose={() => setAdminOpen(false)}
          onChanged={() => onStreamsChanged?.()}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
