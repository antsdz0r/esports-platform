import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty } from "../../components/ui/UI";
import { staggerContainer } from "../../components/ui/motion";
import { useNotifications } from "../../contexts/notifications/NotificationsProvider";
import { proApi } from "../../api_services/pro/ProAPIService";
import ProMatchCard from "../../components/pro/ProMatchCard";
import ProMatchModal from "../../components/stream/ProMatchModal";
import type { ProMatch } from "../../models/pro/ProTypes";

const PRO_GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
const proGameLabel = (s: string): string => PRO_GAME_LABELS[s] ?? s.replace(/-/g, " ");

export default function WatchlistPage() {
  const { token } = useAuth();
  const { isWatched, watchCount } = useNotifications();
  const [proFeed, setProFeed] = useState<ProMatch[]>([]);
  const [activePro, setActivePro] = useState<ProMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setProFeed([]); setLoading(false); return; }
    setLoading(true);
    void proApi.getMatches(200).then((r) => {
      if (r.success && r.data) setProFeed(r.data);
      setLoading(false);
    });
  }, [token, watchCount]);

  const watchedMatches = proFeed.filter((m) => isWatched(m.id));

  return (
    <div>
      <PageHeader eyebrow="Following" title="Watchlist" />

      {loading ? <Spinner /> : watchedMatches.length === 0 ? (
        <Empty message="No matches in your watchlist. Open Pro matches and tap 🔔 on an upcoming match to get notified when it starts." />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {watchedMatches.map((m) => (
            <ProMatchCard key={m.id} m={m} gameLabel={proGameLabel(m.gameSlug)} onOpen={() => setActivePro(m)} />
          ))}
        </motion.div>
      )}

      {activePro && (
        <ProMatchModal match={activePro} gameLabel={proGameLabel(activePro.gameSlug)} onClose={() => setActivePro(null)} />
      )}
    </div>
  );
}
