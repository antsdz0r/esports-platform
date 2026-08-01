import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn } from "../../components/ui/UI";
import { staggerContainer } from "../../components/ui/motion";
import ProTournamentDetailModal from "../../components/pro/ProTournamentDetailModal";
import TournamentCard from "../../components/pro/TournamentCard";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProLeagueDto, ProSerieDto, ProTournamentListDto } from "../../models/pro/ProTournamentTypes";

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
function gameLabel(slug: string): string { return GAME_LABELS[slug] ?? slug.replace(/-/g, " "); }

// Redosled igara po popularnosti (globalna esports gledanost); nepoznate idu na kraj.
const GAME_ORDER = [
  "league-of-legends", "cs-go", "cs2", "cs-2", "csgo", "valorant", "dota-2",
  "ow", "overwatch", "r6-siege", "rainbow-6-siege", "rl", "rocket-league",
  "mlbb", "mobile-legends", "cod-mw", "call-of-duty", "starcraft-2", "kog", "king-of-glory", "fifa",
];
function gameRank(slug: string): number {
  const i = GAME_ORDER.indexOf(slug);
  return i === -1 ? 999 : i;
}

export default function ProTournamentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [games, setGames] = useState<string[]>([]);
  const [game, setGame] = useState<string>("");
  const [leagues, setLeagues] = useState<ProLeagueDto[]>([]);
  const [active, setActive] = useState<ProTournamentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [openLeague, setOpenLeague] = useState<string | null>(null);
  const [series, setSeries] = useState<ProSerieDto[]>([]);
  const [openSerie, setOpenSerie] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<ProTournamentListDto[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await proTournamentApi.getGames();
      if (res.success && res.data && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => gameRank(a) - gameRank(b) || a.localeCompare(b));
        setGames(sorted);
        setGame(sorted[0]);
      } else {
        setError(res.success ? "" : (res.message ?? "Greška"));
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!game) return;
    const load = async () => {
      setLoading(true);
      setOpenLeague(null); setSeries([]); setOpenSerie(null); setTournaments([]);
      const [lRes, aRes] = await Promise.all([proTournamentApi.getLeagues(game), proTournamentApi.getActive(game)]);
      setLeagues(lRes.success && lRes.data ? lRes.data : []);
      setActive(aRes.success && aRes.data ? aRes.data : []);
      setLoading(false);
    };
    void load();
  }, [game]);

  useEffect(() => {
    if (!user) { setFavIds(new Set()); return; }
    void proTournamentApi.getFavoriteIds().then((r) => { if (r.success && r.data) setFavIds(new Set(r.data)); });
  }, [user]);

  const showToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(""), 2200); };

  const toggleFavorite = async (t: ProTournamentListDto, next: boolean) => {
    setFavIds((prev) => { const s = new Set(prev); if (next) s.add(t.externalId); else s.delete(t.externalId); return s; });
    const res = next ? await proTournamentApi.addFavorite(t.externalId) : await proTournamentApi.removeFavorite(t.externalId);
    if (!res.success) {
      setFavIds((prev) => { const s = new Set(prev); if (next) s.delete(t.externalId); else s.add(t.externalId); return s; });
      showToast(res.message ?? "Greška");
      return;
    }
    showToast(next ? "Added to Favorites" : "Uklonjeno iz omiljenih");
  };

  const runSync = async () => {
    setSyncing(true); setError(""); setSuccess("");
    const res = await proTournamentApi.syncStructure();
    if (res.success) {
      setSuccess(`Struktura: ${res.data?.leagues ?? 0} liga, ${res.data?.series ?? 0} serija, ${res.data?.tournaments ?? 0} turnira.`);
      const gRes = await proTournamentApi.getGames();
      if (gRes.success && gRes.data) setGames(gRes.data);
    } else setError(res.message ?? "Sync neuspešan");
    setSyncing(false);
  };

  const toggleLeague = async (id: string) => {
    if (openLeague === id) { setOpenLeague(null); return; }
    setOpenLeague(id); setOpenSerie(null); setTournaments([]); setSeries([]);
    const res = await proTournamentApi.getSeries(id);
    setSeries(res.success && res.data ? res.data : []);
  };

  const pickSerie = async (id: string) => {
    if (openSerie === id) { setOpenSerie(null); setTournaments([]); return; }
    setOpenSerie(id); setTournaments([]);
    const res = await proTournamentApi.getTournaments(id);
    setTournaments(res.success && res.data ? res.data : []);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pro scena"
        title="Turniri"
        action={isAdmin ? (
          <PgBtn variant="primary" size="sm" disabled={syncing} onClick={runSync}>
            {syncing ? "Sinhronizacija..." : "⟳ Sinhronizuj strukturu"}
          </PgBtn>
        ) : undefined}
      />

      {success && <SuccessBox message={success} />}
      {error && <ErrorBox message={error} />}

      {games.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {games.map((g) => {
            const on = g === game;
            return (
              <button key={g} onClick={() => setGame(g)}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em",
                  padding: "9px 18px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                  background: on ? "rgba(0,212,255,0.22)" : "rgba(44,56,98,0.6)",
                  color: on ? "#eafcff" : "var(--text-soft)",
                  border: on ? "1px solid var(--cyan)" : "1px solid rgba(120,150,220,0.32)",
                  boxShadow: on ? "0 0 18px rgba(0,212,255,0.4)" : "0 1px 6px rgba(0,0,0,0.25)",
                }}>
                {gameLabel(g)}
              </button>
            );
          })}
        </div>
      )}

      {loading ? <Spinner /> : games.length === 0 ? (
        <Empty message={isAdmin ? "Nema turnira — klikni Sinhronizuj strukturu da povučeš sa izvora." : "Trenutno nema turnira."} />
      ) : (
        <>
          {/* Aktivni turniri */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
            <span style={{ width: 4, height: 22, borderRadius: 2, background: "linear-gradient(180deg, var(--cyan), var(--violet))", boxShadow: "0 0 12px rgba(0,212,255,0.55)" }} />
            <span style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, letterSpacing: "0.01em", color: "var(--text)" }}>Aktivni turniri</span>
          </div>
          {active.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>Nema aktivnih turnira za ovu igru.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
              {active.map((t) => (
                <TournamentCard key={t.externalId} t={t} onOpen={() => setDetailId(t.externalId)}
                  isFavorite={favIds.has(t.externalId)} onToggleFavorite={toggleFavorite} showFavorite={!!user} />
              ))}
            </motion.div>
          )}

          {/* Sve lige */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, marginTop: 6 }}>
            <span style={{ width: 4, height: 22, borderRadius: 2, background: "linear-gradient(180deg, var(--cyan), var(--violet))", boxShadow: "0 0 12px rgba(0,212,255,0.55)" }} />
            <span style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, letterSpacing: "0.01em", color: "var(--text)" }}>Svi turniri · {gameLabel(game)}</span>
          </div>
          {leagues.length === 0 ? (
            <Empty message="Nema liga za ovu igru." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leagues.map((l) => (
                <div key={l.externalId} className="pg-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => void toggleLeague(l.externalId)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    {l.imageUrl ? <img src={l.imageUrl} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} /> : <span style={{ width: 26 }} />}
                    <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{l.name}</span>
                    {l.hasActive && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--pink)", padding: "2px 8px", borderRadius: 6, background: "rgba(255,45,126,0.1)", border: "1px solid rgba(255,45,126,0.3)" }}>UŽIVO</span>}
                    <span style={{ color: "var(--text-dim)", fontSize: 13 }}>{openLeague === l.externalId ? "▴" : "▾"}</span>
                  </button>

                  {openLeague === l.externalId && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
                        {series.length === 0 ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-dim)" }}>Učitavanje izdanja…</span> :
                          series.map((s) => {
                            const on = openSerie === s.externalId;
                            return (
                              <button key={s.externalId} onClick={() => void pickSerie(s.externalId)}
                                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                                  background: on ? "rgba(124,92,255,0.16)" : "rgba(255,255,255,0.03)", color: on ? "var(--text)" : "var(--text-muted)",
                                  border: on ? "1px solid var(--violet)" : "1px solid var(--border)" }}>
                                {s.year ?? s.fullName}
                              </button>
                            );
                          })}
                      </div>
                      {openSerie && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {tournaments.length === 0 ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-dim)" }}>Nema faza / učitavanje…</span> :
                            tournaments.map((t) => (
                              <button key={t.externalId} onClick={() => setDetailId(t.externalId)}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                                  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                                <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.name}</span>
                                {t.hasBracket && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--cyan)" }}>bracket</span>}
                                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: t.status === "running" ? "var(--pink)" : t.status === "finished" ? "var(--green)" : "var(--cyan)" }}>{t.status}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {detailId && (
        <ProTournamentDetailModal externalId={detailId} gameLabel={gameLabel(game)} onClose={() => setDetailId(null)} />
      )}

      {toast && createPortal(
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100001,
          background: "rgba(10,14,30,0.96)", border: "1px solid var(--cyan)", color: "#eafcff",
          padding: "11px 20px", borderRadius: 11, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 9, boxShadow: "0 10px 34px rgba(0,0,0,0.5), 0 0 18px rgba(0,212,255,0.32)" }}>
          <span style={{ color: "#fff", fontSize: 15 }}>★</span> {toast}
        </div>, document.body)}
    </div>
  );
}

