import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PageHeader, Table, TableHead, Empty, ErrorBox, Spinner, Pagination } from "../../components/ui/UI";
import { auditLogApi } from "../../api_services/audit_logs/AuditLogAPIService";
import type { AuditLogDto } from "../../models/audit/AuditLogTypes";

const PAGE_SIZE = 20;

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("DISQUALIF") || a.includes("FAIL")) return "var(--pink)";
  if (a.includes("CREATE") || a.includes("REGISTER")) return "var(--green)";
  if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("PATCH")) return "var(--gold)";
  if (a.includes("LOGIN") || a.includes("LOGOUT")) return "var(--violet2)";
  return "var(--text-soft)";
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    setError("");
    auditLogApi
      .getAll(p, PAGE_SIZE)
      .then((res) => {
        if (res.success) {
          setLogs(res.data ?? []);
          setTotal(res.pagination?.total ?? 0);
        } else {
          setError(res.message);
        }
      })
      .catch(() => setError("Neuspešno učitavanje audit loga"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Audit Log" />
      {error && <ErrorBox message={error} />}

      {loading ? <Spinner /> : logs.length === 0 && !error ? <Empty message="Nema zabeleženih događaja" /> : (
        <>
          <Table>
            <TableHead columns={["ID", "Vreme", "Korisnik", "Akcija", "Entitet", "Opis", "IP adresa"]} />
            <tbody>
              {logs.map((l, i) => (
                <motion.tr key={l.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  style={{ borderTop: "1px solid var(--border)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(124,92,255,0.06)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                  <td style={{ padding: "13px 18px", fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-dim)" }}>#{l.id}</td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(l.createdAt).toLocaleString("sr")}
                  </td>
                  <td style={{ padding: "13px 18px", fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-dim)" }}>
                    {l.userId != null ? `#${l.userId}` : "—"}
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <span className="pg-badge" style={{ color: actionColor(l.action), border: `1px solid ${actionColor(l.action)}33`, background: `${actionColor(l.action)}14`, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--text-muted)" }}>
                    {l.entity ?? "—"}{l.entityId != null ? ` #${l.entityId}` : ""}
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--text-soft)", maxWidth: 360 }}>{l.description ?? "—"}</td>
                  <td style={{ padding: "13px 18px", fontFamily: "monospace", fontSize: 12, color: "var(--text-dim)" }}>{l.ipAddress ?? "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
