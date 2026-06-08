import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge, Spinner, Empty, ErrorBox, TiltCard } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

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

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");
const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)"];

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elim",
  double_elim: "Double Elim",
  round_robin: "Round Robin",
};

function resolveImg(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : STATIC_BASE + url;
}

export default function GuestTournamentsPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE}tournaments`);
        const data = await res.json() as { success: boolean; data?: Tournament[] };
        if (data.success) setTournaments(data.data ?? []);
        else setError("Greška pri učitavanju turnira");
      } catch {
        setError("Neuspešno učitavanje turnira");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = tournaments.filter(t => !filterStatus || t.status === filterStatus);
  const statuses = [...new Set(tournaments.map(t => t.status))];

  return (
    <div>
      <PageHeader eyebrow="Turniri" title="Aktivni turniri" />

      {/* Filter */}
      {!loading && tournaments.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {["", ...statuses].map(s => {
            const active = filterStatus === s;
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "5px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.2s",
                  border: active ? "1px solid var(--violet)" : "1px solid var(--border)",
                  background: active ? "rgba(124,92,255,0.15)" : "transparent",
                  color: active ? "var(--violet2)" : "var(--text-muted)",
                }}>
                {s === "" ? "Svi" : s}
              </button>
            );
          })}
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty message="Nema dostupnih turnira." />
      ) : (
        <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {filtered.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            const img = resolveImg(t.imageUrl);
            return (
              <motion.div key={t.tournamentId} variants={fadeUp}
                onClick={() => navigate(`/guest/tournaments/${t.tournamentId}`)}
                style={{ cursor: "pointer" }}>
                <TiltCard glow={glow} style={{ padding: 0, overflow: "hidden" }}>
                  {img && (
                    <div style={{ height: 120, overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
                      <img src={img} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{t.name}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {[
                        t.gameName,
                        FORMAT_LABEL[t.format] ?? t.format,
                        `${t.registeredCount ?? 0}/${t.maxTeams} timova`,
                      ].filter(Boolean).map((tag, j) => (
                        <span key={j} style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    {t.prizePool > 0 && (
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: glow }}>
                        💰 ${t.prizePool.toLocaleString()}
                      </p>
                    )}
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: glow, marginTop: 10, opacity: 0.7 }}>PREGLEDAJ DETALJE →</p>
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
