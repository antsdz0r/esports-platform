import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import ProMatchModal from "../../components/stream/ProMatchModal";
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
  { key: "all", label: "Sve" },
  { key: "live", label: "Uživo" },
  { key: "upcoming", label: "Predstojeće" },
  { key: "finished", label: "Završeno" },
];

const STATUS_META: Record<ProMatchStatus, { label: string; color: string; bg: string }> = {
  live: { label: "UŽIVO", color: "var(--pink)", bg: "rgba(255,45,126,0.14)" },
  upcoming: { label: "USKORO", color: "var(--cyan)", bg: "rgba(0,212,255,0.12)" },
  finished: { label: "ZAVRŠENO", color: "var(--green)", bg: "rgba(0,240,160,0.12)" },
  canceled: { label: "OTKAZANO", color: "var(--text-dim)", bg: "rgba(255,255,255,0.05)" },
};

// Zaseban, distinktan panel da se kartice odvoje od pozadine sajta + neon-plavi akcenat.
const CARD_BG = "linear-gradient(165deg, rgba(34,44,82,0.72), rgba(15,19,40,0.9))";
const CARD_BORDER = "1px solid rgba(78,120,210,0.38)";

function TeamCol({ name, logo, won, align }: { name: string | null; logo: string | null; won: boolean; align: "left" | "right" }) {
  const initials = (name ?? "?").slice(0, 3).toUpperCase();
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {logo ? (
        <img src={logo} alt={name ?? ""} style={{ width: 46, height: 46, objectFit: "contain" }} />
      ) : (
        <div style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--text-dim)" }}>{initials}</div>
      )}
      <span style={{
        maxWidth: "100%", fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won ? 800 : 600,
        color: won ? "var(--text)" : "var(--text-muted)", textAlign: align === "right" ? "right" : "left",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name ?? "TBD"}
      </span>
    </div>
  );
}

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
    else setError(res.message ?? "Greška pri učitavanju");
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
      setSuccess(`Sinhronizovano ${res.data?.synced ?? 0} mečeva.`);
      await load();
    } else {
      setError(res.message ?? "Sinhronizacija neuspešna");
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
        eyebrow="Uživo · Pro scena"
        title="Pro mečevi"
        action={isAdmin ? (
          <PgBtn variant="primary" size="sm" disabled={syncing} onClick={runSync}>
            {syncing ? "Sinhronizacija..." : "⟳ Sinhronizuj"}
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
                {g === "all" ? "Sve" : gameLabel(g)}
              </button>
            );
          })}
        </div>
      )}

      {loading ? <Spinner /> : visible.length === 0 ? (
        <Empty message={isAdmin ? "Nema pro mečeva — klikni Sinhronizuj da povučeš sa izvora." : "Trenutno nema pro mečeva."} />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {visible.map((m) => {
            const st = STATUS_META[m.status];
            const won1 = m.status === "finished" && m.team1Score > m.team2Score;
            const won2 = m.status === "finished" && m.team2Score > m.team1Score;
            const when = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
            return (
              <motion.div key={m.id} variants={fadeUp}
                whileHover={{ scale: 1.02, y: -3, boxShadow: "0 14px 40px rgba(0,212,255,0.22)" }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                onClick={() => setActive(m)}
                style={{ display: "flex", flexDirection: "column", borderRadius: 16, padding: 16, cursor: "pointer", background: CARD_BG, border: CARD_BORDER }}>

                {/* Top meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 9px", borderRadius: 6, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {m.status === "live" && <span className="pg-dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />}
                    {st.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--cyan)", padding: "2px 8px", borderRadius: 6, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.30)" }}>
                    {gameLabel(m.gameSlug)}
                  </span>
                </div>

                {/* League */}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.leagueName ?? m.serieName ?? ""}{m.tournamentName ? ` · ${m.tournamentName}` : ""}
                </div>

                {/* Datum i vreme */}
                {when && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em",
                      color: "var(--cyan)", background: "rgba(0,212,255,0.09)",
                      border: "1px solid rgba(0,212,255,0.28)", padding: "4px 11px", borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 13 }}>🕐</span>{when}
                    </span>
                  </div>
                )}

                {/* Teams: A  score  B */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                  <TeamCol name={m.team1Name} logo={m.team1Logo} won={won1} align="left" />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 8, minWidth: 56 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>
                      {m.team1Score}<span style={{ color: "var(--text-dim)", margin: "0 4px" }}>:</span>{m.team2Score}
                    </span>
                    {m.bestOf ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-dim)" }}>BO{m.bestOf}</span> : null}
                  </div>
                  <TeamCol name={m.team2Name} logo={m.team2Logo} won={won2} align="right" />
                </div>

                {/* WATCH bar */}
                <div style={{
                  marginTop: 16, textAlign: "center", padding: "9px 0", borderRadius: 10,
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 800, letterSpacing: "0.22em",
                  color: "var(--cyan)", background: "rgba(0,212,255,0.08)",
                  border: "1.5px solid var(--cyan)", boxShadow: "0 0 14px rgba(0,212,255,0.25)",
                }}>
                  WATCH
                </div>
              </motion.div>
            );
          })}
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
