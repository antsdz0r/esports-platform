import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, StatCard, NodeBadge, Spinner, Counter, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";

interface DbNode  { name: string; role: string; host: string; port: number; status: string; latency_ms?: number; last_check: string; }
interface ApiNode { name: string; url: string;  status: string; latency_ms?: number; active_connections?: number; last_check: string; }

const BASE = import.meta.env.VITE_API_URL;

function mapDbNode(raw: Record<string, unknown>): DbNode {
  const name = String(raw.name ?? "");
  return {
    name: name === "master" ? "MySQL Master" : name === "slave1" ? "MySQL Slave 1" : name === "slave2" ? "MySQL Slave 2" : name,
    role: name === "master" ? "master" : "slave",
    host: String(raw.host ?? ""),
    port: Number(raw.port ?? 0),
    status: String(raw.status ?? "offline"),
    last_check: raw.lastCheck ? String(raw.lastCheck) : new Date().toISOString(),
  };
}

function mapApiNode(raw: Record<string, unknown>): ApiNode {
  return {
    name: String(raw.name ?? "API Server"),
    url: String(raw.url ?? ""),
    status: String(raw.status ?? "unreachable"),
    latency_ms: raw.latencyMs != null ? Number(raw.latencyMs) : undefined,
    active_connections: raw.activeConnections != null ? Number(raw.activeConnections) : 0,
    last_check: raw.lastCheck ? String(raw.lastCheck) : new Date().toISOString(),
  };
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [dbNodes, setDbNodes] = useState<DbNode[]>([]);
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetchHealth = useCallback(async () => {
    try {
      const [dbRes, apiRes] = await Promise.allSettled([
        fetch(`${BASE}health/db`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch(`${BASE}health/api`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);
      if (dbRes.status === "fulfilled") {
        setDbNodes(parseData<Record<string, unknown>>(dbRes.value).map(mapDbNode));
      }
      if (apiRes.status === "fulfilled") {
        setApiNodes(parseData<Record<string, unknown>>(apiRes.value).map(mapApiNode));
      }
    } catch {
      setDbNodes([]);
      setApiNodes([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => { void fetchHealth(); setTick((t) => t + 1); }, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const all = [...dbNodes, ...apiNodes];
  const healthy = all.filter((n) => n.status === "healthy").length;
  const degraded = all.filter((n) => n.status === "degraded").length;
  const down = all.filter((n) => n.status === "unreachable" || n.status === "offline").length;

  const NodeCard = ({ node }: { node: DbNode | ApiNode }) => {
    const isDb = "role" in node;
    const accent = node.status === "healthy" ? "var(--green)" : node.status === "degraded" ? "var(--gold)" : "var(--pink)";
    const latColor = node.latency_ms && node.latency_ms > 500 ? "var(--gold)" : "var(--green)";
    return (
      <motion.div variants={fadeUp} whileHover={{ y: -4 }} className="pg-glass"
        style={{ padding: 20, position: "relative", overflow: "hidden", border: `1px solid ${accent}33` }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <div>
            <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{node.name}</p>
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-dim)" }}>{isDb ? `${(node as DbNode).host}:${(node as DbNode).port}` : (node as ApiNode).url}</p>
          </div>
          <NodeBadge status={node.status} />
        </div>
        <div style={{ display: "flex", gap: 22, marginBottom: 12 }}>
          <div>
            <p style={statLbl}>Latencija</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: node.status === "unreachable" ? "var(--pink)" : latColor }}>{node.latency_ms != null ? `${node.latency_ms}ms` : "N/A"}</p>
          </div>
          <div>
            <p style={statLbl}>{isDb ? "Uloga" : "Konekcije"}</p>
            {isDb
              ? <span className="pg-badge" style={{ background: (node as DbNode).role === "master" ? "rgba(255,45,126,0.12)" : "rgba(124,92,255,0.12)", color: (node as DbNode).role === "master" ? "var(--pink)" : "var(--violet2)", border: `1px solid ${(node as DbNode).role === "master" ? "rgba(255,45,126,0.3)" : "rgba(124,92,255,0.3)"}`, marginTop: 4 }}>{(node as DbNode).role.toUpperCase()}</span>
              : <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{(node as ApiNode).active_connections ?? 0}</p>}
          </div>
        </div>
        <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-dim)" }}>Provera: {new Date(node.last_check).toLocaleTimeString("sr")}</p>
      </motion.div>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Admin · Control Panel" title="Dashboard"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/admin/games"><PgBtn variant="ghost" size="sm">🎮 Igre</PgBtn></Link>
            <Link to="/admin/tournaments"><PgBtn variant="ghost" size="sm">🏆 Turniri</PgBtn></Link>
            <Link to="/admin/users"><PgBtn variant="ghost" size="sm">👥 Korisnici</PgBtn></Link>
          </div>
        } />

      <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 32 }}>
        <motion.div variants={fadeUp}><StatCard label="Ukupno čvorova" value={<Counter value={all.length} />} icon="🖥️" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Healthy"  value={<Counter value={healthy} />}  color="var(--green)" icon="✅" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Degraded" value={<Counter value={degraded} />} color="var(--gold)"  icon="⚠️" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Offline"  value={<Counter value={down} />}     color="var(--pink)"  icon="❌" /></motion.div>
      </motion.div>

      {loading ? <Spinner /> : (
        <>
          <SectionTitle label="Database Nodes" right={`AUTO-REFRESH 10s · tick#${tick}`} />
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16, marginBottom: 32 }}>
            {dbNodes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nema podataka o DB čvorovima.</p> : dbNodes.map((n, i) => <NodeCard key={i} node={n} />)}
          </motion.div>

          <SectionTitle label="API Server Nodes" />
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {apiNodes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nema podataka o API čvorovima.</p> : apiNodes.map((n, i) => <NodeCard key={i} node={n} />)}
          </motion.div>
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

const statLbl: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 };
