import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, StatusBadge, Spinner, Empty, ErrorBox, PgBtn, TiltCard } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";
import TournamentCard from "../../components/pro/TournamentCard";
import ProTournamentDetailModal from "../../components/pro/ProTournamentDetailModal";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProTournamentListDto } from "../../models/pro/ProTournamentTypes";

interface Tournament {
  tournamentId: number;
  name: string;
  format: string;
  maxTeams: number;
  status: string;
  prizePool: number;
  registrationDeadline: string;
  gameName?: string;
  registeredCount?: number;
  imageUrl?: string | null;
}

interface Team {
  teamId: number;
  teamName: string;
  tag: string;
}

interface MyReg { tournamentId: number; teamId: number; }

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

function resolveImg(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : STATIC_BASE + url;
}

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elim",
  double_elim: "Double Elim",
  round_robin: "Round Robin",
};
const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)"];

const PRO_GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
const proGameLabel = (slug: string): string => PRO_GAME_LABELS[slug] ?? slug.replace(/-/g, " ");

export default function TournamentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [myRegs, setMyRegs] = useState<MyReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFormat, setFilterFormat] = useState("");

  // Registration modal state
  const [regModal, setRegModal] = useState<Tournament | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [regSaving, setRegSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Omiljeni pro turniri (favoriti)
  const [favs, setFavs] = useState<ProTournamentListDto[]>([]);
  const [favDetailId, setFavDetailId] = useState<string | null>(null);
  const [favToast, setFavToast] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadAll = async () => {
    try {
      const [tRes, teamsRes, regsRes] = await Promise.all([
        fetch(`${BASE}tournaments`, { headers }),
        fetch(`${BASE}teams/captain`, { headers }),
        fetch(`${BASE}tournaments/my-registrations`, { headers }),
      ]);
      const tData = await tRes.json();
      const teamsData = await teamsRes.json();
      const regsData = await regsRes.json();
      setTournaments(parseData<Tournament>(tData));
      setCaptainTeams(parseData<Team>(teamsData));
      setMyRegs(parseData<MyReg>(regsData));
    } catch {
      setError("Neuspešno učitavanje turnira");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [token]);

  useEffect(() => {
    if (!token) { setFavs([]); return; }
    void proTournamentApi.listFavorites().then((r) => { if (r.success && r.data) setFavs(r.data); });
  }, [token]);

  const removeFavorite = async (t: ProTournamentListDto) => {
    setFavs((prev) => prev.filter((x) => x.externalId !== t.externalId));
    const res = await proTournamentApi.removeFavorite(t.externalId);
    setFavToast(res.success ? "Uklonjeno iz omiljenih" : (res.message ?? "Greška"));
    window.setTimeout(() => setFavToast(""), 2200);
  };

  const openRegModal = (t: Tournament) => {
    if (captainTeams.length === 0) { setError("Nisi kapiten nijednog tima. Kreiraj tim ili postani kapiten."); return; }
    setSelectedTeamId(captainTeams.length === 1 ? captainTeams[0].teamId : null);
    setRegModal(t);
    setError("");
  };

  const register = async () => {
    if (!regModal || !selectedTeamId) return;
    setRegSaving(true);
    try {
      const res = await fetch(`${BASE}tournaments/${regModal.tournamentId}/register`, {
        method: "POST", headers, body: JSON.stringify({ teamId: selectedTeamId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Neuspešna prijava"); }
      else { setRegModal(null); await loadAll(); setError(""); }
    } catch { setError("Neuspešna prijava"); }
    finally { setRegSaving(false); }
  };

  const cancelReg = async (tournamentId: number) => {
    const reg = myRegs.find(r => r.tournamentId === tournamentId);
    if (!reg) return;
    setCancellingId(tournamentId);
    try {
      await fetch(`${BASE}tournaments/${tournamentId}/register/${reg.teamId}`, { method: "DELETE", headers });
      await loadAll();
    } catch { setError("Greška pri odjavi"); }
    finally { setCancellingId(null); }
  };

  const filtered = tournaments.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterFormat && t.format !== filterFormat) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    background: "rgba(10,12,28,0.8)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 14px",
    color: "var(--text)", fontFamily: "var(--font-ui)", fontSize: 13, outline: "none", cursor: "pointer",
  };

  return (
    <div>
      <PageHeader eyebrow="Takmičenja" title="Turniri" />
      {error && <ErrorBox message={error} />}

      {favs.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
            <span style={{ width: 4, height: 22, borderRadius: 2, background: "linear-gradient(180deg, var(--gold), var(--pink))", boxShadow: "0 0 12px rgba(255,196,68,0.5)" }} />
            <span style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>★ Omiljeni pro turniri</span>
          </div>
          <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {favs.map((t) => (
              <TournamentCard key={t.externalId} t={t} onOpen={() => setFavDetailId(t.externalId)}
                isFavorite={true} onToggleFavorite={(ft, next) => { if (!next) void removeFavorite(ft); }} />
            ))}
          </motion.div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Svi statusi</option>
          <option value="open">Prijave otvorene</option>
          <option value="ongoing">U toku</option>
          <option value="completed">Završen</option>
        </select>
        <select style={selectStyle} value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)}>
          <option value="">Svi formati</option>
          <option value="single_elim">Single Elimination</option>
          <option value="double_elim">Double Elimination</option>
          <option value="round_robin">Round Robin</option>
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="Nema turnira koji odgovaraju filterima." /> : (
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 20 }}>
          {filtered.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            const registered = t.registeredCount ?? 0;
            const pct = Math.min(100, (registered / t.maxTeams) * 100);
            const myReg = myRegs.find(r => r.tournamentId === t.tournamentId);
            const isRegistered = !!myReg;
            const isCancelling = cancellingId === t.tournamentId;
            const img = resolveImg(t.imageUrl);
            return (
              <motion.div key={t.tournamentId} variants={fadeUp}>
                <TiltCard glow={glow} style={{ overflow: "hidden", cursor: "pointer" }}
                  onClick={() => navigate(`/dashboard/tournaments/${t.tournamentId}`)}>
                  <div style={{ height: 110, position: "relative", overflow: "hidden",
                    background: `linear-gradient(135deg, ${glow}28, rgba(13,16,35,0.4)), radial-gradient(circle at 70% 30%, ${glow}33, transparent 60%)`,
                    borderBottom: "1px solid var(--border)" }}>
                    {img && <img src={img} alt={t.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    {img && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,6,15,0.45) 0%, rgba(5,6,15,0.05) 40%, rgba(5,6,15,0.35) 100%)" }} />}
                    {!img && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />}
                    <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {t.gameName && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.35)", padding: "4px 10px", borderRadius: 6, backdropFilter: "blur(6px)" }}>{t.gameName}</span>}
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: "#fff", opacity: 0.25, letterSpacing: "0.05em" }}>
                      {FORMAT_LABEL[t.format]?.toUpperCase() ?? t.format}
                    </div>
                  </div>

                  <div style={{ padding: "18px 20px" }}>
                    <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 14, lineHeight: 1.25 }}>{t.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>👥 {registered}/{t.maxTeams} timova</span>
                      {t.prizePool > 0 && <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--gold)", textShadow: "0 0 14px rgba(255,196,68,0.4)" }}>${t.prizePool}</span>}
                    </div>
                    <div style={{ height: 4, background: "rgba(124,92,255,0.12)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{ height: "100%", background: `linear-gradient(90deg, ${glow}, var(--cyan))`, borderRadius: 3, boxShadow: `0 0 10px ${glow}` }} />
                    </div>

                    {t.status === "open" ? (
                      isRegistered ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(0,240,160,0.06)", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--green)", textAlign: "center" }}>
                            ✓ Prijavljen
                          </div>
                          <PgBtn variant="ghost" size="sm" disabled={isCancelling}
                            onClick={e => { e.stopPropagation(); void cancelReg(t.tournamentId); }}>
                            {isCancelling ? "..." : "Otkaži"}
                          </PgBtn>
                        </div>
                      ) : (
                        <PgBtn variant="primary" size="sm" full
                          onClick={e => { e.stopPropagation(); openRegModal(t); }}>
                          Prijavi tim
                        </PgBtn>
                      )
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-ui)" }}>
                        Rok: {new Date(t.registrationDeadline).toLocaleDateString("sr")}
                      </p>
                    )}
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Registration modal */}
      {createPortal(
        <AnimatePresence>
          {regModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={e => { if (e.target === e.currentTarget) setRegModal(null); }}>
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
                className="pg-glass" style={{ width: "100%", maxWidth: 400, padding: 28, borderRadius: 16, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Prijava na turnir</h3>
                  <button onClick={() => setRegModal(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)" }}>
                  Turni: <strong style={{ color: "var(--text)" }}>{regModal.name}</strong>
                </p>
                {error && <ErrorBox message={error} />}
                {captainTeams.length === 1 ? (
                  <div style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(124,92,255,0.06)" }}>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Tim</p>
                    <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {captainTeams[0].teamName} <span style={{ color: "var(--violet2)", fontSize: 12 }}>[{captainTeams[0].tag}]</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Odaberi tim</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {captainTeams.map(team => (
                        <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)}
                          style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${selectedTeamId === team.teamId ? "var(--violet)" : "var(--border)"}`, background: selectedTeamId === team.teamId ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{team.teamName}</span>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--violet2)" }}>[{team.tag}]</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <PgBtn variant="ghost" size="sm" onClick={() => setRegModal(null)}>Otkaži</PgBtn>
                  <PgBtn variant="primary" size="sm" disabled={regSaving || !selectedTeamId} onClick={register}>
                    {regSaving ? "Prijavljivanje..." : "Prijavi tim"}
                  </PgBtn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {favDetailId && (
        <ProTournamentDetailModal
          externalId={favDetailId}
          gameLabel={proGameLabel(favs.find((f) => f.externalId === favDetailId)?.gameSlug ?? "")}
          onClose={() => setFavDetailId(null)}
        />
      )}

      {favToast && createPortal(
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100001,
          background: "rgba(10,14,30,0.96)", border: "1px solid var(--cyan)", color: "#eafcff",
          padding: "11px 20px", borderRadius: 11, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 9, boxShadow: "0 10px 34px rgba(0,0,0,0.5), 0 0 18px rgba(0,212,255,0.32)" }}>
          <span style={{ color: "#fff", fontSize: 15 }}>★</span> {favToast}
        </div>, document.body)}
    </div>
  );
}
