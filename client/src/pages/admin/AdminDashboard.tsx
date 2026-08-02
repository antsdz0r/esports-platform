import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, StatCard, Counter, Spinner, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";
import { auditLogApi } from "../../api_services/audit_logs/AuditLogAPIService";
import type { AuditLogDto } from "../../models/audit/AuditLogTypes";

interface TournamentRow { tournamentId: number; status: string }
interface DbNodeRow { status?: string }

const BASE = import.meta.env.VITE_API_URL;

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("DISQUALIF") || a.includes("FAIL")) return "var(--pink)";
  if (a.includes("CREATE") || a.includes("REGISTER")) return "var(--green)";
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("PATCH")) return "var(--gold)";
  if (a.includes("LOGIN") || a.includes("LOGOUT")) return "var(--violet2)";
  return "var(--text-soft)";
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [usersCount, setUsersCount] = useState(0);
  const [gamesCount, setGamesCount] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [recent, setRecent] = useState<AuditLogDto[]>([]);
  const [dbHealthy, setDbHealthy] = useState(0);
  const [dbTotal, setDbTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const [usersRes, gamesRes, tournRes, auditRes, dbRes] = await Promise.allSettled([
        fetch(`${BASE}users`, { headers }).then((r) => r.json()),
        fetch(`${BASE}games`, { headers }).then((r) => r.json()),
        fetch(`${BASE}tournaments`, { headers }).then((r) => r.json()),
        auditLogApi.getAll(1, 6),
        fetch(`${BASE}health/db`, { headers }).then((r) => r.json()),
      ]);

      if (usersRes.status === "fulfilled") setUsersCount(parseData<object>(usersRes.value).length);
      if (gamesRes.status === "fulfilled") setGamesCount(parseData<object>(gamesRes.value).length);
      if (tournRes.status === "fulfilled") setTournaments(parseData<TournamentRow>(tournRes.value));
      if (auditRes.status === "fulfilled" && auditRes.value.success) setRecent(auditRes.value.data ?? []);
      if (dbRes.status === "fulfilled") {
        const nodes = parseData<DbNodeRow>(dbRes.value);
        setDbTotal(nodes.length);
        setDbHealthy(nodes.filter((n) => n.status === "healthy").length);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const tOpen = tournaments.filter((t) => t.status === "open").length;
  const tOngoing = tournaments.filter((t) => t.status === "ongoing" || t.status === "locked").length;
  const tCompleted = tournaments.filter((t) => t.status === "completed").length;

  return (
    <div>
      <PageHeader eyebrow="Admin · Overview" title="Dashboard"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/admin/tournaments"><PgBtn variant="primary" size="sm">+ Tournament</PgBtn></Link>
            <Link to="/admin/games"><PgBtn variant="ghost" size="sm">🎮 Games</PgBtn></Link>
            <Link to="/admin/users"><PgBtn variant="ghost" size="sm">👥 Users</PgBtn></Link>
            <Link to="/admin/audit"><PgBtn variant="ghost" size="sm">📜 Audit</PgBtn></Link>
            <Link to="/admin/health"><PgBtn variant="ghost" size="sm">♥ Health</PgBtn></Link>
          </div>
        } />

      {loading ? <Spinner /> : (
        <>
          <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 28 }}>
            <motion.div variants={fadeUp}><StatCard label="Users" value={<Counter value={usersCount} />} icon="👥" /></motion.div>
            <motion.div variants={fadeUp}><StatCard label="Games in catalog" value={<Counter value={gamesCount} />} icon="🎮" /></motion.div>
            <motion.div variants={fadeUp}><StatCard label="Tournaments (total)" value={<Counter value={tournaments.length} />} icon="🏆" /></motion.div>
            <motion.div variants={fadeUp}><StatCard label="Active tournaments" value={<Counter value={tOngoing} />} color="var(--gold)" icon="⚔️" /></motion.div>
          </motion.div>

          <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 32 }}>
            <motion.div variants={fadeUp}><StatCard label="Open registrations" value={<Counter value={tOpen} />} color="var(--green)" icon="📝" /></motion.div>
            <motion.div variants={fadeUp}><StatCard label="Completed tournaments" value={<Counter value={tCompleted} />} color="var(--violet2)" icon="🏁" /></motion.div>
            <motion.div variants={fadeUp}>
              <Link to="/admin/health" style={{ textDecoration: "none" }}>
                <StatCard label="Zdravlje baze" value={`${dbHealthy}/${dbTotal}`} color={dbTotal > 0 && dbHealthy === dbTotal ? "var(--green)" : "var(--pink)"} icon="🛢️" sub="klikni za Health" />
              </Link>
            </motion.div>
          </motion.div>

          <SectionTitle label="Latest activity" right="audit log" />
          <div className="pg-glass" style={{ padding: 8, border: "1px solid var(--border)" }}>
            {recent.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>No recorded activity.</p>
            ) : recent.map((l, i) => (
              <motion.div key={l.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <span className="pg-badge" style={{ minWidth: 130, textAlign: "center", color: actionColor(l.action), border: `1px solid ${actionColor(l.action)}33`, background: `${actionColor(l.action)}14`, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700 }}>{l.action}</span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-soft)" }}>{l.description ?? (l.entity ?? "—")}</span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString("en-GB")}</span>
              </motion.div>
            ))}
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
              <Link to="/admin/audit" style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--violet2)", textDecoration: "none" }}>Ceo audit log →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ label, right }: { label: string; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent)" }} />
      {right && <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-dim)" }}>{right}</span>}
    </div>
  );
}
