import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn } from "../../components/ui/UI";
import { staggerContainer } from "../../components/ui/motion";
import ProMatchModal from "../../components/stream/ProMatchModal";
import ProMatchCard from "../../components/pro/ProMatchCard";
import { proApi } from "../../api_services/pro/ProAPIService";
import type { ProMatch, ProMatchStatus } from "../../models/pro/ProTypes";

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL",
  "cs-go": "CS2",
  "csgo": "CS2",
  "cs-2": "CS2",
  "cs2": "CS2",
  "dota-2": "Dota 2",
  "valorant": "Valorant",
  "rainbow-6-siege": "R6",
  "overwatch": "Overwatch",
};

function gameLabel(slug: string): string {
  return GAME_LABELS[slug] ?? slug.replace(/-/g, " ");
}

const STATUS_FILTERS: { key: "all" | ProMatchStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
];

export default function ProPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [matches, setMatches] = useState<ProMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [active, setActive] = useState<ProMatch | null>(null);
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProMatchStatus>("all");

  const load = async () => {
    setLoading(true);
    const res = await proApi.getMatches(200);
    if (res.success && res.data) setMatches(res.data);
    else setError(res.message ?? "Failed to load");
    setLoading(false);
  };

  // Tiho osvežavanje (bez spinnera) — hvata nove rezultate iz baze.
  // Ako je modal otvoren, osvezi i njegov mec (npr. nakon dodavanja kastera).
  const refresh = async () => {
    const res = await proApi.getMatches(200);
    if (res.success && res.data) {
      const fresh = res.data;
      setMatches(fresh);
      setActive((cur) => (cur ? fresh.find((m) => m.id === cur.id) ?? cur : cur));
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const id = window.setInterval(() => { void refresh(); }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setError("");
    setSuccess("");
    const res = await proApi.sync();
    if (res.success) {
      setSuccess(`Synced ${res.data?.synced ?? 0} matches.`);
      await load();
    } else {
      setError(res.message ?? "Sync failed");
    }
    setSyncing(false);
  };

  const games = useMemo(() => [...new Set(matches.map((m) => m.gameSlug).filter(Boolean))], [matches]);
  const visible = matches.filter((m) =>
    (gameFilter === "all" || m.gameSlug === gameFilter) &&
    (statusFilter === "all" || m.status === statusFilter)
  );

  return (
    <div>
      <PageHeader
        eyebrow="Live · Pro scene"
        title="Pro matches"
        action={isAdmin ? (
          <PgBtn variant="primary" size="sm" disabled={syncing} onClick={runSync}>
            {syncing ? "Syncing..." : "⟳ Sync"}
          </PgBtn>
        ) : undefined}
      />

      {success && <SuccessBox message={success} />}
      {error && <ErrorBox message={error} />}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              style={{
                fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                background: isActive ? "rgba(0,212,255,0.16)" : "rgba(255,255,255,0.03)",
                color: isActive ? "var(--text)" : "var(--text-muted)",
                border: isActive ? "1px solid rgba(0,212,255,0.45)" : "1px solid var(--border)",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {games.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {["all", ...games].map((g) => {
            const isActive = gameFilter === g;
            return (
              <button key={g} onClick={() => setGameFilter(g)}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: isActive ? "rgba(0,212,255,0.16)" : "rgba(255,255,255,0.03)",
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                  border: isActive ? "1px solid rgba(0,212,255,0.45)" : "1px solid var(--border)",
                }}>
                {g === "all" ? "All" : gameLabel(g)}
              </button>
            );
          })}
        </div>
      )}

      {loading ? <Spinner /> : visible.length === 0 ? (
        <Empty message={isAdmin ? "No pro matches — click Sync to pull from the source." : "No pro matches right now."} />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {visible.map((m) => (
            <ProMatchCard key={m.id} m={m} gameLabel={gameLabel(m.gameSlug)} onOpen={() => setActive(m)} />
          ))}
        </motion.div>
      )}

      {active && (
        <ProMatchModal
          match={active}
          gameLabel={gameLabel(active.gameSlug)}
          onClose={() => setActive(null)}
          isAdmin={isAdmin}
          onStreamsChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
