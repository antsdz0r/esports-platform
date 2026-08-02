import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../ui/motion";
import type { Badge, BadgeTier } from "../../models/pickem/PickemTypes";

const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: "#c8894e",
  silver: "#c3ccd8",
  gold: "var(--gold)",
  platinum: "var(--cyan)",
};

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum",
};

export default function BadgeShelf({ badges }: { badges: Badge[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        Unlocked <span style={{ color: "var(--cyan)", fontWeight: 800 }}>{earnedCount}</span> of {badges.length} badges
      </p>
      <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="show"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
        {badges.map((b) => {
          const c = TIER_COLOR[b.tier];
          return (
            <motion.div key={b.code} variants={fadeUp}
              title={b.earned && b.earnedAt ? `Unlocked ${new Date(b.earnedAt).toLocaleDateString("en-GB")}` : "Locked"}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center",
                padding: "18px 12px", borderRadius: 14, position: "relative", overflow: "hidden",
                background: b.earned ? "linear-gradient(165deg, rgba(34,44,82,0.7), rgba(15,19,40,0.9))" : "rgba(255,255,255,0.02)",
                border: b.earned ? `1.5px solid ${c}` : "1px solid var(--border)",
                boxShadow: b.earned ? `0 0 18px ${c}33` : "none",
                opacity: b.earned ? 1 : 0.5,
                filter: b.earned ? "none" : "grayscale(0.8)",
              }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}>{b.earned ? b.icon : "🔒"}</span>
              <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 800, color: b.earned ? "var(--text)" : "var(--text-muted)" }}>{b.name}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--text-dim)", lineHeight: 1.35 }}>{b.description}</span>
              <span style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: c }}>{TIER_LABEL[b.tier]}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
