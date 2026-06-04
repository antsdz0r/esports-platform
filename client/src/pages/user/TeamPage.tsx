import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, PgBtn, TiltCard, FormField } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Team {
  team_id: number;
  team_name: string;
  tag: string;
  logo: string;
  description: string;
}

const BASE = import.meta.env.VITE_API_URL;
const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)", "var(--gold)"];

export default function TeamsPage() {
  const { token } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ teamName: "", tag: "", logo: "", description: "" });
  const [creating, setCreating] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}teams`, { headers });
        const data = await res.json();
        setTeams(data.success ? data.data : []);
      } catch {
        setError("Neuspešno učitavanje timova");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const createTeam = async () => {
    if (!form.teamName || !form.tag) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}teams`, { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setShowCreate(false); setForm({ teamName: "", tag: "", logo: "", description: "" }); window.location.reload(); }
      else setError(data.message);
    } catch {
      setError("Neuspešno kreiranje tima");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Ekipe" title="Moji timovi"
        action={<PgBtn variant="primary" onClick={() => setShowCreate((v) => !v)}>+ Novi tim</PgBtn>} />

      {error && <ErrorBox message={error} />}

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 24 }}>
            <div className="pg-glass" style={{ padding: 26, border: "1px solid var(--border-bright)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text)", marginBottom: 20 }}>KREIRAJ TIM</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <FormField label="Naziv tima *">
                  <input placeholder="Dragon Force" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} className="pg-input" />
                </FormField>
                <FormField label="Tag (2-6) *">
                  <input placeholder="DF" maxLength={6} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ marginBottom: 14 }}>
                <FormField label="Logo URL (opciono)">
                  <input placeholder="https://..." value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ marginBottom: 20 }}>
                <FormField label="Opis (opciono)">
                  <input placeholder="Kratki opis tima..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <PgBtn variant="primary" onClick={createTeam} disabled={creating}>{creating ? "Kreiranje..." : "Kreiraj"}</PgBtn>
                <PgBtn variant="ghost" onClick={() => setShowCreate(false)}>Otkaži</PgBtn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? <Spinner /> : teams.length === 0 ? <Empty message="Nemaš nijedan tim. Kreiraj jedan!" /> : (
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {teams.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            return (
              <motion.div key={t.team_id} variants={fadeUp}>
                <TiltCard glow={glow} style={{ padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, background: `${glow}1a`, border: `1px solid ${glow}45`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", boxShadow: `0 0 18px ${glow}30` }}>
                      {t.logo
                        ? <img src={t.logo} alt={t.tag} style={{ width: 54, height: 54, objectFit: "cover" }} />
                        : <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 900, color: glow }}>{t.tag?.slice(0, 2)}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{t.team_name}</p>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: glow }}>[{t.tag}]</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, minHeight: 38 }}>{t.description || "Nema opisa."}</p>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
