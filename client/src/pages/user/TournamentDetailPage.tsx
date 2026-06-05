import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, StatusBadge, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Tournament {
  tournamentId: number;
  name: string;
  format: string;
  status: string;
  prizePool: number;
  maxTeams: number;
  registrationDeadLine?: string;
  registrationDeadline?: string;
  gameName?: string | null;
  gameId?: number;
  registrations: Registration[];
}

interface Registration {
  teamId: number;
  teamName: string | null;
  status: string;
  seed: number | null;
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
}

const BASE = import.meta.env.VITE_API_URL;

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elimination",
  double_elim: "Double Elimination",
  round_robin: "Round Robin",
};

export default function TournamentDetailPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`${BASE}tournaments/${id}`, { headers }),
        fetch(`${BASE}matches/tournament/${id}`, { headers }),
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      if (!tRes.ok) { setError("Turnir nije pronađen"); return; }
      setTournament(tData);
      setMatches(mData.success ? mData.data : []);
    } catch {
      setError("Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id, token]);

  const updateStatus = async (newStatus: string) => {
    if (!tournament) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`${BASE}tournaments/${tournament.tournamentId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: tournament.name,
          gameId: tournament.gameId,
          format: tournament.format,
          maxTeams: tournament.maxTeams,
          registrationDeadline: deadline,
          prizePool: tournament.prizePool,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Greška pri izmeni statusa"); return; }
      setSuccess(`Status promenjen u "${newStatus}"`);
      await load();
    } catch {
      setError("Greška pri izmeni statusa");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>;
  if (error || !tournament) return <div style={{ padding: 40 }}><ErrorBox message={error || "Turnir nije pronađen"} /></div>;

  // Handle both casing variants from backend
  const deadline = tournament.registrationDeadLine ?? tournament.registrationDeadline ?? "";
  const deadlineDisplay = deadline ? new Date(deadline).toLocaleDateString("sr") : "—";

  const backPath = isAdmin ? "/admin/tournaments" : "/dashboard/tournaments";
  const registrations = tournament.registrations ?? [];
  const rounds = matches.length > 0 ? [...new Set(matches.map(m => m.round))].sort((a, b) => a - b) : [];
  const hasMatches = matches.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? "Admin · Turniri" : "Takmičenja"}
        title={tournament.name}
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <PgBtn variant="ghost" size="sm" onClick={() => navigate(backPath)}>← Nazad</PgBtn>
            {isAdmin && tournament.status === "locked" && (
              <PgBtn variant="primary" size="sm" disabled={statusUpdating} onClick={() => updateStatus("ongoing")}>
                {statusUpdating ? "..." : "▶ Pokreni turnir"}
              </PgBtn>
            )}
            {isAdmin && tournament.status === "ongoing" && (
              <PgBtn variant="cyan" size="sm" disabled={statusUpdating} onClick={() => updateStatus("completed")}>
                {statusUpdating ? "..." : "✓ Završi turnir"}
              </PgBtn>
            )}
          </div>
        }
      />

      {success && <SuccessBox message={success} />}
      {error && <ErrorBox message={error} />}

      {/* Tournament meta */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        {[
          { label: "Status", value: <StatusBadge status={tournament.status} /> },
          { label: "Format", value: FORMAT_LABEL[tournament.format] ?? tournament.format },
          { label: "Igra", value: tournament.gameName ?? "—" },
          { label: "Timovi", value: `${registrations.length}/${tournament.maxTeams}` },
          { label: "Nagrada", value: tournament.prizePool > 0 ? `$${tournament.prizePool}` : "—" },
          { label: "Rok prijave", value: deadlineDisplay },
        ].map(({ label, value }) => (
          <div key={label} className="pg-glass" style={{ padding: "14px 20px", borderRadius: 12, minWidth: 110 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{value}</div>
          </div>
        ))}
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: hasMatches ? "280px 1fr" : "280px 1fr", gap: 24, alignItems: "start" }}>
        {/* Registered Teams */}
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
          <SectionTitle label="Prijavljeni timovi" count={registrations.length} />
          {registrations.length === 0 ? (
            <Empty message="Nema prijavljenih timova." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...registrations]
                .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
                .map((reg, i) => (
                  <motion.div key={reg.teamId} variants={fadeUp}
                    className="pg-glass" style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "var(--text-dim)", minWidth: 20, textAlign: "center" }}>
                      {reg.seed ?? (i + 1)}
                    </span>
                    <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {reg.teamName ?? `Tim #${reg.teamId}`}
                    </span>
                    <TeamStatusBadge status={reg.status} />
                  </motion.div>
                ))}
            </div>
          )}
        </motion.div>

        {/* Bracket */}
        <div>
          <SectionTitle label="Bracket" count={matches.length} />
          {hasMatches ? (
            <div style={{ overflowX: "auto", paddingBottom: 12 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", minWidth: "max-content" }}>
                {rounds.map(round => {
                  const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.gameId - b.gameId);
                  return (
                    <div key={round} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center", marginBottom: 4 }}>
                        {roundLabel(round, rounds.length)}
                      </p>
                      {roundMatches.map(match => (
                        <MatchCard key={match.gameId} match={match} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)" }}>
                  {tournament.status === "open"
                    ? "Bracket će biti generisan kada admin zaključa turnir."
                    : "Nema mečeva za ovaj turnir."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const won1 = match.winnerTeamId !== null && match.winnerTeamId === match.team1Id;
  const won2 = match.winnerTeamId !== null && match.winnerTeamId === match.team2Id;
  const parts = match.score?.split(":") ?? ["0", "0"];
  const s1 = parts[0] ?? "0";
  const s2 = parts[1] ?? "0";
  const accentColor = match.status === "completed" ? "var(--green)" : match.status === "ongoing" ? "var(--cyan)" : "var(--border)";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="pg-glass" style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${accentColor}44` }}>
      <div style={{ height: 3, background: accentColor, opacity: match.status === "scheduled" ? 0.3 : 1 }} />
      <div style={{ padding: "10px 14px" }}>
        <TeamRow name={match.team1Name} score={s1} won={won1} bye={match.team1Id === null} />
        <div style={{ height: 1, background: "var(--border)", margin: "6px 0", opacity: 0.4 }} />
        <TeamRow name={match.team2Name} score={s2} won={won2} bye={match.team2Id === null} />
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-dim)" }}>#{match.gameId}</span>
          <MatchStatusBadge status={match.status} />
        </div>
      </div>
    </motion.div>
  );
}

function TeamRow({ name, score, won, bye }: { name: string | null; score: string; won: boolean; bye: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <span style={{ fontSize: 10, minWidth: 14 }}>{won ? "🏆" : ""}</span>
      <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 600, color: bye ? "var(--text-dim)" : won ? "var(--text)" : "var(--text-soft)", fontStyle: bye ? "italic" : "normal" }}>
        {bye ? "BYE" : (name ?? "TBD")}
      </span>
      {!bye && <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: won ? "var(--green)" : "var(--text-dim)", minWidth: 20, textAlign: "right" }}>{score}</span>}
    </div>
  );
}

function SectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--violet2)", background: "rgba(124,92,255,0.12)", padding: "2px 8px", borderRadius: 20 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent)" }} />
    </div>
  );
}

function TeamStatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    pending:      { c: "var(--gold)",  label: "pending" },
    confirmed:    { c: "var(--green)", label: "confirmed" },
    disqualified: { c: "var(--pink)",  label: "dq" },
  };
  const s = map[status] ?? { c: "var(--text-muted)", label: status };
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: s.c, background: `${s.c}18`, padding: "2px 8px", borderRadius: 6 }}>{s.label}</span>;
}

function MatchStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { scheduled: "var(--text-dim)", ongoing: "var(--cyan)", completed: "var(--green)" };
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: map[status] ?? "var(--text-dim)" }}>{status}</span>;
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Polufinale";
  if (fromEnd === 2) return "Cetvrtfinale";
  return `Runda ${round}`;
}
