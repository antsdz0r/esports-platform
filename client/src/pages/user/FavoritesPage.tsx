import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { PageHeader, Spinner, Empty } from "../../components/ui/UI";
import { staggerContainer } from "../../components/ui/motion";
import TournamentCard from "../../components/pro/TournamentCard";
import ProTournamentDetailModal from "../../components/pro/ProTournamentDetailModal";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProTournamentListDto } from "../../models/pro/ProTournamentTypes";

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
const gameLabel = (s: string): string => GAME_LABELS[s] ?? s.replace(/-/g, " ");

export default function FavoritesPage() {
  const [favs, setFavs] = useState<ProTournamentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void proTournamentApi.listFavorites().then((r) => {
      if (r.success && r.data) setFavs(r.data);
      setLoading(false);
    });
  }, []);

  const showToast = (m: string): void => { setToast(m); window.setTimeout(() => setToast(""), 2000); };

  // Na ovoj stranici su svi već favoriti — klik na zvezdicu ih uklanja.
  const onToggleFavorite = async (t: ProTournamentListDto, next: boolean): Promise<void> => {
    if (next) return;
    setFavs((prev) => prev.filter((x) => x.externalId !== t.externalId));
    const res = await proTournamentApi.removeFavorite(t.externalId);
    showToast(res.success ? "Removed from favorites" : (res.message ?? "Failed"));
  };

  return (
    <div>
      <PageHeader eyebrow="Pro scene" title="Favorite tournaments" />

      {loading ? <Spinner /> : favs.length === 0 ? (
        <Empty message="No favorites yet. Open Tournaments and tap the ★ on a tournament to save it here." />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {favs.map((t) => (
            <TournamentCard key={t.externalId} t={t} onOpen={() => setDetailId(t.externalId)}
              isFavorite={true} onToggleFavorite={onToggleFavorite} />
          ))}
        </motion.div>
      )}

      {detailId && (
        <ProTournamentDetailModal
          externalId={detailId}
          gameLabel={gameLabel(favs.find((f) => f.externalId === detailId)?.gameSlug ?? "")}
          onClose={() => setDetailId(null)}
        />
      )}

      {toast && createPortal(
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100002,
          background: "rgba(10,14,30,0.96)", border: "1px solid var(--cyan)", color: "#eafcff",
          padding: "11px 20px", borderRadius: 11, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 9, boxShadow: "0 10px 34px rgba(0,0,0,0.5), 0 0 18px rgba(0,212,255,0.32)" }}>
          <span style={{ color: "#fff" }}>★</span> {toast}
        </div>, document.body)}
    </div>
  );
}
