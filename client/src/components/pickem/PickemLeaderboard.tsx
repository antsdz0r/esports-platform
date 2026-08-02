import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../ui/motion";
import type { Leaderboard, LeaderboardEntry } from "../../models/pickem/PickemTypes";

const API_ORIGIN = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");
function avatarUrl(pic: string | null): string | null {
  if (!pic) return null;
  return pic.startsWith("http") ? pic : `${API_ORIGIN}${pic}`;
}

function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function Row({ e, isMe }: { e: LeaderboardEntry; isMe: boolean }) {
  const pic = avatarUrl(e.profilePicture);
  const initials = e.gamerTag.slice(0, 2).toUpperCase();
  return (
    <motion.div variants={fadeUp}
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
        background: isMe ? "rgba(0,212,255,0.10)" : "rgba(255,255,255,0.02)",
        border: isMe ? "1.5px solid rgba(0,212,255,0.45)" : "1px solid var(--border)",
      }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: e.rank <= 3 ? 20 : 14, fontWeight: 900, color: e.rank <= 3 ? "var(--text)" : "var(--text-dim)", textAlign: "center" }}>
        {rankBadge(e.rank)}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg, rgba(124,92,255,0.25), rgba(0,229,255,0.15))", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {pic ? <img src={pic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: "var(--violet2)" }}>{initials}</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.gamerTag}</span>
            {isMe && <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "var(--cyan)" }}>YOU</span>}
          </div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-dim)" }}>
            {e.correctPredictions}/{e.totalPredictions} correct · {e.accuracy}% · 🔥{e.bestStreak}{e.badgeCount > 0 ? ` · 🏅${e.badgeCount}` : ""}
          </span>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, color: "var(--cyan)", lineHeight: 1 }}>{e.totalPoints}</div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)" }}>PTS</span>
      </div>
    </motion.div>
  );
}

export default function PickemLeaderboard({ data, currentUserId }: { data: Leaderboard; currentUserId: number }) {
  const inTop = data.me ? data.entries.some((e) => e.userId === currentUserId) : true;
  return (
    <div>
      <motion.div variants={staggerContainer(0.03)} initial="hidden" animate="show"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.entries.map((e) => <Row key={e.userId} e={e} isMe={e.userId === currentUserId} />)}
      </motion.div>

      {/* Show my row separately when I'm outside the visible top N */}
      {data.me && !inTop && (
        <>
          <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 16, margin: "6px 0" }}>···</div>
          <Row e={data.me} isMe />
        </>
      )}
    </div>
  );
}
