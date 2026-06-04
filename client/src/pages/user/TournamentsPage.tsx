import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, StatusBadge, Spinner, Empty, ErrorBox, PgBtn, TiltCard } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Tournament {
  tournamentid: number;
  name: string;
  format: string;
  max_teams: number;
  status: string;
  prize_pool: number;
  registration_deadline: string;
  game_name?: string;
  registered_count?: number;
}

const BASE = import.meta.env.VITE_API_URL;

const FORMAT_LABEL: Record<string, string> = {
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
  round_robin: "Round Robin",
};

const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)"];

export default function TournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFormat, setFilterFormat] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}tournaments`, { headers });
        const data = await res.json();
        setTournaments(data.success ? data.data : []);
      } catch {
        setError("Neuspešno učitavanje turnira");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const register = async (tournamentId: number, teamId: number) => {
    try {
      const res = await fetch(`${BASE}tournaments/${tournamentId}/register`, {
        method: "POST", headers, body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!data.success) setError(data.message);
      else window.location.reload();
    } catch {
      setError("Neuspešna prijava");
    }
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

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Svi statusi</option>
          <option value="open">Prijave otvorene</option>
          <option value="ongoing">U toku</option>
          <option value="completed">Završen</option>
        </select>
        <select style={selectStyle} value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)}>
          <option value="">Svi formati</option>
          <option value="single_elimination">Single Elimination</option>
          <option value="double_elimination">Double Elimination</option>
          <option value="round_robin">Round Robin</option>
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="Nema turnira koji odgovaraju filterima." /> : (
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 20 }}>
          {filtered.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            const pct = t.registered_count !== undefined ? Math.min(100, (t.registered_count / t.max_teams) * 100) : 0;
            return (
              <motion.div key={t.tournamentid} variants={fadeUp}>
                <TiltCard glow={glow} style={{ overflow: "hidden" }}>
                  {/* Banner */}
                  <div style={{ height: 110, position: "relative", overflow: "hidden",
                    background: `linear-gradient(135deg, ${glow}28, rgba(13,16,35,0.4)), radial-gradient(circle at 70% 30%, ${glow}33, transparent 60%)`,
                    borderBottom: "1px solid var(--border)" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
                    <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {t.game_name && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", background: "rgba(0,0,0,0.35)", padding: "4px 10px", borderRadius: 6, backdropFilter: "blur(6px)" }}>{t.game_name}</span>}
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: "#fff", opacity: 0.25, letterSpacing: "0.05em" }}>
                      {FORMAT_LABEL[t.format]?.toUpperCase() ?? t.format}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "18px 20px" }}>
                    <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 14, lineHeight: 1.25 }}>{t.name}</h3>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>👥 {t.registered_count ?? "?"}/{t.max_teams} timova</span>
                      {t.prize_pool > 0 && <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--gold)", textShadow: "0 0 14px rgba(255,196,68,0.4)" }}>${t.prize_pool}</span>}
                    </div>

                    {/* Progress */}
                    {t.registered_count !== undefined && (
                      <div style={{ height: 4, background: "rgba(124,92,255,0.12)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ height: "100%", background: `linear-gradient(90deg, ${glow}, var(--cyan))`, borderRadius: 3, boxShadow: `0 0 10px ${glow}` }} />
                      </div>
                    )}

                    {t.status === "open"
                      ? <PgBtn variant="primary" size="sm" full onClick={() => register(t.tournamentid, 1)}>Prijavi tim</PgBtn>
                      : <p style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-ui)" }}>Rok: {new Date(t.registration_deadline).toLocaleDateString("sr")}</p>}
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
