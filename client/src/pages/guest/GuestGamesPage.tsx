import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, Spinner, Empty, ErrorBox, TiltCard } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Game {
  gameId: number;
  name: string;
  tag: string;
  genre: string;
  maxPlayers: number;
  imageUrl?: string | null;
}

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");
const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)", "var(--gold)"];

function resolveImg(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : STATIC_BASE + url;
}

export default function GuestGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE}games`);
        const data = await res.json() as { success: boolean; data?: Game[] };
        if (data.success) setGames(data.data ?? []);
        else setError("Failed to load games");
      } catch {
        setError("Failed to load games");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Catalog" title="Games" />

      {error && <ErrorBox message={error} />}

      {loading ? <Spinner /> : games.length === 0 ? (
        <Empty message="No games available." />
      ) : (
        <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
          {games.map((g, i) => {
            const glow = GLOWS[i % GLOWS.length];
            const img = resolveImg(g.imageUrl);
            return (
              <motion.div key={g.gameId} variants={fadeUp}>
                <TiltCard glow={glow} style={{ padding: 0, overflow: "hidden" }}>
                  {img ? (
                    <div style={{ height: 130, overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
                      <img src={img} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", background: `${glow}12`, borderRadius: "12px 12px 0 0" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: glow }}>{g.tag}</span>
                    </div>
                  )}
                  <div style={{ padding: "16px 18px" }}>
                    <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{g.name}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 5, background: `${glow}18`, border: `1px solid ${glow}40`, color: glow }}>
                        {g.genre}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        {g.maxPlayers} players/team
                      </span>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
