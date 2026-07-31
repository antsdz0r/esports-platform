import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import ProTournamentDetailModal from "../../components/pro/ProTournamentDetailModal";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProLeagueDto, ProSerieDto, ProTournamentListDto } from "../../models/pro/ProTournamentTypes";

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
function gameLabel(slug: string): string { return GAME_LABELS[slug] ?? slug.replace(/-/g, " "); }

const CARD_BG = "linear-gradient(165deg, rgba(34,44,82,0.72), rgba(15,19,40,0.9))";
const CARD_BORDER = "1px solid rgba(78,120,210,0.38)";

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

  useEffect(() => {
    const load = async () => {
      const res = await proTournamentApi.getGames();
      if (res.success && res.data && res.data.length > 0) {
        setGames(res.data);
        setGame(res.data[0]);
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
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: on ? "rgba(0,212,255,0.16)" : "rgba(255,255,255,0.03)", color: on ? "var(--text)" : "var(--text-muted)",
                  border: on ? "1px solid rgba(0,212,255,0.45)" : "1px solid var(--border)" }}>
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
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Aktivni turniri</div>
          {active.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>Nema aktivnih turnira za ovu igru.</p>
          ) : (
            <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
              {active.map((t) => (
                <motion.div key={t.externalId} variants={fadeUp} whileHover={{ scale: 1.02, y: -2, boxShadow: "0 12px 34px rgba(0,212,255,0.2)" }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }} onClick={() => setDetailId(t.externalId)}
                  style={{ cursor: "pointer", borderRadius: 14, padding: 14, background: CARD_BG, border: CARD_BORDER }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span className="pg-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pink)" }} />
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--pink)" }}>UŽIVO</span>
                    {t.hasBracket && <span style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-dim)" }}>bracket</span>}
                  </div>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{t.leagueName ?? t.name}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-secondary)" }}>{t.name}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Sve lige */}
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Svi turniri · {gameLabel(game)}</div>
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
    </div>
  );
}
