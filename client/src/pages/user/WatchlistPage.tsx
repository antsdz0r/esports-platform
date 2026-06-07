import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, StatusBadge, PgBtn, TiltCard } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";

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

interface Match {
  gameId: number;
  team1Id: number | null;
  team2Id: number | null;
  team1Name: string | null;
  team2Name: string | null;
  round: number;
  score: string;
  status: string;
  winnerTeamId: number | null;
  scheduledTime: string | null;
}

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elim",
  double_elim: "Double Elim",
  round_robin: "Round Robin",
};
const GLOWS = ["var(--gold)", "var(--cyan)", "var(--violet)", "var(--pink)", "var(--green)"];

function resolveImg(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : STATIC_BASE + url;
}

export default function WatchlistPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [latest, setLatest] = useState<Record<number, Match | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    try {
      const res = await fetch(`${BASE}tournaments/watchlist/my`, { headers });
      const data = await res.json();
      if (!res.ok) { setError("Neuspešno učitavanje liste praćenja"); return; }
      const list = parseData<Tournament>(data);
      setTournaments(list);

      // Za svaki praćeni turnir povuci najrelevantniji meč (rezultat / uživo / sledeći)
      const entries = await Promise.all(
        list.map(async (t) => {
          try {
            const mRes = await fetch(`${BASE}matches/tournament/${t.tournamentId}`, { headers });
            const matches = parseData<Match>(await mRes.json());
            const completed = matches
              .filter((m) => m.status === "completed" && m.winnerTeamId !== null)
              .sort((a, b) => b.gameId - a.gameId);
            const ongoing = matches.find((m) => m.status === "in_progress" || m.status === "ongoing");
            const upcoming = matches
              .filter((m) => m.status === "scheduled")
              .sort((a, b) => a.round - b.round || a.gameId - b.gameId)[0];
            const pick = ongoing ?? completed[0] ?? upcoming ?? null;
            return [t.tournamentId, pick] as const;
          } catch {
            return [t.tournamentId, null] as const;
          }
        })
      );
      setLatest(Object.fromEntries(entries));
    } catch {
      setError("Neuspešno učitavanje liste praćenja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const unwatch = async (tournamentId: number) => {
    setRemovingId(tournamentId);
    try {
      const res = await fetch(`${BASE}tournaments/${tournamentId}/watch`, { method: "DELETE", headers });
      if (!res.ok) { setError("Greška pri uklanjanju sa liste"); return; }
      setTournaments((prev) => prev.filter((t) => t.tournamentId !== tournamentId));
    } catch {
      setError("Greška pri uklanjanju sa liste");
    } finally {
      setRemovingId(null);
    }
  };

  const renderLatest = (m: Match | null) => {
    if (!m) {
      return <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-dim)" }}>Još nema mečeva</span>;
    }
    const t1 = m.team1Name ?? "TBD";
    const t2 = m.team2Name ?? "TBD";
    if (m.status === "completed" && m.winnerTeamId !== null) {
      const winner = m.winnerTeamId === m.team1Id ? t1 : t2;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>{t1} vs {t2}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--gold)" }}>{m.score}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--green)" }}>🏆 {winner}</span>
        </div>
      );
    }
    if (m.status === "in_progress" || m.status === "ongoing") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--pink)", boxShadow: "0 0 8px var(--pink)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)" }}>UŽIVO · {t1} vs {t2}</span>
        </div>
      );
    }
    return (
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>
        Sledeći: {t1} vs {t2}{m.scheduledTime ? ` · ${new Date(m.scheduledTime).toLocaleDateString("sr")}` : ""}
      </span>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Praćenje"
        title="Watchlist"
        action={<PgBtn variant="ghost" size="sm" onClick={() => navigate("/dashboard/tournaments")}>Pregledaj turnire →</PgBtn>}
      />
      {error && <ErrorBox message={error} />}

      {loading ? <Spinner /> : tournaments.length === 0 ? (
        <Empty message="Ne pratiš nijedan turnir. Otvori turnir i klikni „Prati“ da ga dodaš ovde." />
      ) : (
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 20 }}>
          {tournaments.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            const registered = t.registeredCount ?? 0;
            const pct = Math.min(100, (registered / Math.max(1, t.maxTeams)) * 100);
            const img = resolveImg(t.imageUrl);
            const isRemoving = removingId === t.tournamentId;
            return (
              <motion.div key={t.tournamentId} variants={fadeUp}>
                <TiltCard glow={glow} style={{ overflow: "hidden", cursor: "pointer" }}
                  onClick={() => navigate(`/dashboard/tournaments/${t.tournamentId}`)}>
                  <div style={{ height: 110, position: "relative", overflow: "hidden",
                    background: img ? undefined : `linear-gradient(135deg, ${glow}28, rgba(13,16,35,0.4)), radial-gradient(circle at 70% 30%, ${glow}33, transparent 60%)`,
                    borderBottom: "1px solid var(--border)" }}>
                    {img && <img src={img} alt={t.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />}
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
                    <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {t.gameName && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.35)", padding: "4px 10px", borderRadius: 6, backdropFilter: "blur(6px)" }}>{t.gameName}</span>}
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ position: "absolute", bottom: 10, right: 14, fontFamily: "var(--font-ui)", fontSize: 18, color: "var(--gold)", textShadow: "0 0 12px rgba(255,196,68,0.5)" }}>★</div>
                  </div>

                  <div style={{ padding: "18px 20px" }}>
                    <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 12, lineHeight: 1.25 }}>{t.name}</h3>

                    <div style={{ marginBottom: 14, minHeight: 20 }}>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Najnoviji rezultat</p>
                      {renderLatest(latest[t.tournamentId] ?? null)}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>👥 {registered}/{t.maxTeams} · {FORMAT_LABEL[t.format] ?? t.format}</span>
                      {t.prizePool > 0 && <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--gold)", textShadow: "0 0 14px rgba(255,196,68,0.4)" }}>${t.prizePool}</span>}
                    </div>
                    <div style={{ height: 4, background: "rgba(124,92,255,0.12)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{ height: "100%", background: `linear-gradient(90deg, ${glow}, var(--cyan))`, borderRadius: 3, boxShadow: `0 0 10px ${glow}` }} />
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <PgBtn variant="ghost" size="sm" full disabled={isRemoving}
                        onClick={() => void unwatch(t.tournamentId)}>
                        {isRemoving ? "..." : "★ Otprati"}
                      </PgBtn>
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
