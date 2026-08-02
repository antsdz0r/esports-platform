import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, StatCard, NodeBadge, Spinner, Counter } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";

interface DbNode {
  name: string;
  label: string;
  role: "master" | "slave";
  host: string;
  port: number;
  status: string;
  latencyMs: number | null;
  replicaOk: boolean | null;
  lastCheck: string;
}

interface ApiNode {
  name: string;
  url: string;
  status: string;
  latencyMs: number | null;
  activeConnections: number;
  lastCheck: string;
}

interface RawDbNode {
  name?: string;
  host?: string;
  port?: number;
  status?: string;
  latencyMs?: number | null;
  replicaOk?: boolean;
  lastCheck?: string;
}

interface RawApiNode {
  name?: string;
  url?: string;
  status?: string;
  latencyMs?: number | null;
  activeConnections?: number;
  lastCheck?: string;
}

const BASE = import.meta.env.VITE_API_URL;

function dbLabel(name: string): string {
  if (name === "master") return "MySQL Master";
  if (name === "slave1") return "MySQL Slave 1";
  if (name === "slave2") return "MySQL Slave 2";
  return name;
}

function mapDb(raw: RawDbNode): DbNode {
  const name = String(raw.name ?? "");
  const role: "master" | "slave" = name === "master" ? "master" : "slave";
  return {
    name,
    label: dbLabel(name),
    role,
    host: String(raw.host ?? ""),
    port: Number(raw.port ?? 0),
    status: String(raw.status ?? "offline"),
    latencyMs: raw.latencyMs == null ? null : Number(raw.latencyMs),
    replicaOk: role === "master" ? null : Boolean(raw.replicaOk),
    lastCheck: raw.lastCheck ? String(raw.lastCheck) : new Date().toISOString(),
  };
}

function mapApi(raw: RawApiNode): ApiNode {
  return {
    name: String(raw.name ?? "API"),
    url: String(raw.url ?? ""),
    status: String(raw.status ?? "unreachable"),
    latencyMs: raw.latencyMs == null ? null : Number(raw.latencyMs),
    activeConnections: Number(raw.activeConnections ?? 0),
    lastCheck: raw.lastCheck ? String(raw.lastCheck) : new Date().toISOString(),
  };
}

function statusColor(status: string): string {
  if (status === "healthy") return "var(--green)";
  if (status === "degraded") return "var(--gold)";
  return "var(--pink)";
}

const statLbl: React.CSSProperties = { fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 };

export default function HealthPage() {
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
      if (dbRes.status === "fulfilled") setDbNodes(parseData<RawDbNode>(dbRes.value).map(mapDb));
      if (apiRes.status === "fulfilled") setApiNodes(parseData<RawApiNode>(apiRes.value).map(mapApi));
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

  const latColor = (ms: number | null) => (ms != null && ms > 500 ? "var(--gold)" : "var(--green)");

  return (
    <div>
      <PageHeader eyebrow="Admin · Monitoring" title="Health Dashboard" />

      <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 32 }}>
        <motion.div variants={fadeUp}><StatCard label="Total nodes" value={<Counter value={all.length} />} icon="🖥️" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Healthy"  value={<Counter value={healthy} />}  color="var(--green)" icon="✅" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Degraded" value={<Counter value={degraded} />} color="var(--gold)"  icon="⚠️" /></motion.div>
        <motion.div variants={fadeUp}><StatCard label="Offline"  value={<Counter value={down} />}     color="var(--pink)"  icon="❌" /></motion.div>
      </motion.div>

      {loading ? <Spinner /> : (
        <>
          <SectionTitle label="Database nodes (master + replicas)" right={`AUTO-REFRESH 10s · tick#${tick}`} />
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 32 }}>
            {dbNodes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data for DB nodes.</p> : dbNodes.map((n) => {
              const accent = statusColor(n.status);
              return (
                <motion.div key={n.name} variants={fadeUp} whileHover={{ y: -4 }} className="pg-glass"
                  style={{ padding: 20, position: "relative", overflow: "hidden", border: `1px solid ${accent}33` }}>
                  <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{n.label}</p>
                      <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-dim)" }}>{n.host}:{n.port}</p>
                    </div>
                    <NodeBadge status={n.status} />
                  </div>
                  <div style={{ display: "flex", gap: 22, marginBottom: 12 }}>
                    <div>
                      <p style={statLbl}>Latency</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: n.status === "offline" || n.status === "unreachable" ? "var(--pink)" : latColor(n.latencyMs) }}>{n.latencyMs != null ? `${n.latencyMs}ms` : "N/A"}</p>
                    </div>
                    <div>
                      <p style={statLbl}>Role</p>
                      <span className="pg-badge" style={{ background: n.role === "master" ? "rgba(255,45,126,0.12)" : "rgba(124,92,255,0.12)", color: n.role === "master" ? "var(--pink)" : "var(--violet2)", border: `1px solid ${n.role === "master" ? "rgba(255,45,126,0.3)" : "rgba(124,92,255,0.3)"}`, marginTop: 4 }}>{n.role.toUpperCase()}</span>
                    </div>
                  </div>
                  {n.role === "slave" && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={statLbl}>Replication</p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: n.replicaOk ? "var(--green)" : "var(--pink)" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.replicaOk ? "var(--green)" : "var(--pink)", boxShadow: `0 0 6px ${n.replicaOk ? "var(--green)" : "var(--pink)"}`, display: "inline-block" }} />
                        {n.replicaOk ? "Active · in read rotation" : "Stale · reading from master"}
                      </span>
                    </div>
                  )}
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-dim)" }}>Checked: {new Date(n.lastCheck).toLocaleTimeString("en-GB")}</p>
                </motion.div>
              );
            })}
          </motion.div>

          <SectionTitle label="API server nodes" />
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {apiNodes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data for API nodes.</p> : apiNodes.map((n) => {
              const accent = statusColor(n.status);
              return (
                <motion.div key={n.name} variants={fadeUp} whileHover={{ y: -4 }} className="pg-glass"
                  style={{ padding: 20, position: "relative", overflow: "hidden", border: `1px solid ${accent}33` }}>
                  <div style={{ position: "absolute", top: -40, right: -40, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{n.name}</p>
                      <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-dim)" }}>{n.url}</p>
                    </div>
                    <NodeBadge status={n.status} />
                  </div>
                  <div style={{ display: "flex", gap: 22 }}>
                    <div>
                      <p style={statLbl}>Latency</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: n.status === "unreachable" ? "var(--pink)" : latColor(n.latencyMs) }}>{n.latencyMs != null ? `${n.latencyMs}ms` : "N/A"}</p>
                    </div>
                    <div>
                      <p style={statLbl}>Connections</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{n.activeConnections}</p>
                    </div>
                  </div>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-dim)", marginTop: 12 }}>Checked: {new Date(n.lastCheck).toLocaleTimeString("en-GB")}</p>
                </motion.div>
              );
            })}
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
