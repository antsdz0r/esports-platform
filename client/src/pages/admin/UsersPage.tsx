import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, Table, TableHead, RoleBadge, Empty, ErrorBox, Spinner } from "../../components/ui/UI";
import { usersApi } from "../../api_services/users/UsersAPIService";
import type { UserDto } from "../../models/user/UserTypes";

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    usersApi.getAll()
      .then((res) => { if (res.success) setUsers(res.data ?? []); else setError(res.message); })
      .catch(() => setError("Neuspešno učitavanje korisnika"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Korisnici" />
      {error && <ErrorBox message={error} />}

      <div style={{ marginBottom: 20 }}>
        <input placeholder="🔍  Pretraži po korisničkom imenu ili emailu..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pg-input" style={{ maxWidth: 420 }} />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 && !error ? <Empty message="Nema korisnika" /> : (
        <Table>
          <TableHead columns={["ID", "Korisničko ime", "Email", "Uloga", "Status"]} />
          <tbody>
            {filtered.map((u, i) => (
              <motion.tr key={u.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{ borderTop: "1px solid var(--border)", transition: "background 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(124,92,255,0.06)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <td style={{ padding: "13px 18px", fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-dim)" }}>#{u.id}</td>
                <td style={{ padding: "13px 18px", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{u.username}</td>
                <td style={{ padding: "13px 18px", fontSize: 13, color: "var(--text-muted)" }}>{u.email}</td>
                <td style={{ padding: "13px 18px" }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: "13px 18px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: u.isActive ? "var(--green)" : "var(--text-dim)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: u.isActive ? "var(--green)" : "var(--text-dim)", boxShadow: u.isActive ? "0 0 6px var(--green)" : "none", display: "inline-block" }} />
                    {u.isActive ? "Aktivan" : "Neaktivan"}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
