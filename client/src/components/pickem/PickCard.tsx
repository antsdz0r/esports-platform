import { motion } from "framer-motion";
import { fadeUp } from "../ui/motion";
import type { PickemMatch } from "../../models/pickem/PickemTypes";

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL",
  "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant",
  "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
export function gameLabel(slug: string): string {
  return GAME_LABELS[slug] ?? slug.replace(/-/g, " ");
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: "LIVE", color: "var(--pink)", bg: "rgba(255,45,126,0.14)" },
  upcoming: { label: "UPCOMING", color: "var(--cyan)", bg: "rgba(0,212,255,0.12)" },
  finished: { label: "FINISHED", color: "var(--green)", bg: "rgba(0,240,160,0.12)" },
  canceled: { label: "CANCELED", color: "var(--text-dim)", bg: "rgba(255,255,255,0.05)" },
};

const CARD_BG = "linear-gradient(165deg, rgba(34,44,82,0.72), rgba(15,19,40,0.9))";
const CARD_BORDER = "1px solid rgba(78,120,210,0.38)";

function TeamButton({ name, logo, side, mySide, locked, isWinner, pct, onPick, busy }: {
  name: string | null; logo: string | null; side: 1 | 2; mySide: number | null;
  locked: boolean; isWinner: boolean; pct: number; onPick: () => void; busy: boolean;
}) {
  const selected = mySide === side;
  const initials = (name ?? "?").slice(0, 3).toUpperCase();
  const accent = selected ? "var(--cyan)" : isWinner ? "var(--green)" : "var(--border)";
  const bg = selected ? "rgba(0,212,255,0.12)" : isWinner ? "rgba(0,240,160,0.10)" : "rgba(255,255,255,0.03)";

  return (
    <button
      onClick={onPick}
      disabled={locked || busy}
      style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "14px 10px 10px", borderRadius: 12, position: "relative", overflow: "hidden",
        cursor: locked || busy ? "default" : "pointer",
        background: bg, border: `1.5px solid ${accent}`,
        boxShadow: selected ? "0 0 16px rgba(0,212,255,0.25)" : "none",
        transition: "all 0.15s",
      }}
    >
      {logo ? (
        <img src={logo} alt={name ?? ""} style={{ width: 44, height: 44, objectFit: "contain" }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text-dim)" }}>{initials}</div>
      )}
      <span style={{
        maxWidth: "100%", fontFamily: "var(--font-head)", fontSize: 13,
        fontWeight: selected || isWinner ? 800 : 600,
        color: selected ? "var(--cyan)" : isWinner ? "var(--text)" : "var(--text-muted)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name ?? "TBD"}
      </span>

      {/* Community vote bar */}
      <div style={{ width: "100%", height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: selected ? "var(--cyan)" : "var(--violet2)", transition: "width 0.4s" }} />
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--text-dim)" }}>{pct}%</span>

      {selected && (
        <span style={{ position: "absolute", top: 6, right: 8, fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "var(--cyan)" }}>
          YOUR PICK
        </span>
      )}
    </button>
  );
}

export default function PickCard({ match, onPick, onRemove, busy }: {
  match: PickemMatch;
  onPick: (matchId: number, side: 1 | 2) => void;
  onRemove: (matchId: number) => void;
  busy: boolean;
}) {
  const st = STATUS_META[match.status] ?? STATUS_META.upcoming;
  const total = match.team1Votes + match.team2Votes;
  const pct1 = total > 0 ? Math.round((match.team1Votes / total) * 100) : 0;
  const pct2 = total > 0 ? 100 - pct1 : 0;
  const won1 = match.status === "finished" && match.team1Score > match.team2Score;
  const won2 = match.status === "finished" && match.team2Score > match.team1Score;
  const when = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  const showScore = match.status === "live" || match.status === "finished";

  // Footer status line
  let footer: React.ReactNode = null;
  if (!match.locked) {
    footer = match.mySide
      ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>Tap the other team to change</span>
          <button onClick={() => onRemove(match.matchId)} disabled={busy}
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--pink)", background: "none", border: "none", cursor: busy ? "default" : "pointer", padding: 0 }}>
            Remove pick
          </button>
        </div>
      )
      : <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: "var(--cyan)" }}>PICK THE WINNER</span>;
  } else if (match.mySide) {
    const settled = match.myIsCorrect !== null;
    if (settled) {
      const ok = match.myIsCorrect;
      footer = (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", color: ok ? "var(--green)" : "var(--pink)" }}>
          {ok ? `✓ Correct · +${match.myPoints} pts` : "✗ Wrong · 0 pts"}
        </span>
      );
    } else {
      footer = <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)" }}>Locked · awaiting result</span>;
    }
  } else {
    footer = <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)" }}>Locked · you didn't pick</span>;
  }

  return (
    <motion.div variants={fadeUp}
      style={{ display: "flex", flexDirection: "column", borderRadius: 16, padding: 16, background: CARD_BG, border: CARD_BORDER }}>

      {/* Top meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {match.status === "live" && <span className="pg-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />}
          {st.label}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--cyan)", padding: "2px 8px", borderRadius: 6, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.30)" }}>
          {gameLabel(match.gameSlug)}
        </span>
        {match.bestOf ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)" }}>BO{match.bestOf}</span> : null}
        {showScore && (
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
            {match.team1Score}<span style={{ color: "var(--text-dim)", margin: "0 3px" }}>:</span>{match.team2Score}
          </span>
        )}
      </div>

      {/* League + time */}
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {match.leagueName ?? ""}{match.tournamentName ? ` · ${match.tournamentName}` : ""}
      </div>
      {when && (
        <div style={{ textAlign: "center", marginBottom: 12, fontFamily: "var(--font-ui)", fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)" }}>
          🕐 {when}
        </div>
      )}

      {/* Team pick buttons */}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <TeamButton name={match.team1Name} logo={match.team1Logo} side={1} mySide={match.mySide}
          locked={match.locked} isWinner={won1} pct={pct1} busy={busy} onPick={() => onPick(match.matchId, 1)} />
        <div style={{ display: "flex", alignItems: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text-dim)" }}>VS</div>
        <TeamButton name={match.team2Name} logo={match.team2Logo} side={2} mySide={match.mySide}
          locked={match.locked} isWinner={won2} pct={pct2} busy={busy} onPick={() => onPick(match.matchId, 2)} />
      </div>

      {/* Footer status */}
      <div style={{ marginTop: 14, minHeight: 20, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {footer}
      </div>
    </motion.div>
  );
}
