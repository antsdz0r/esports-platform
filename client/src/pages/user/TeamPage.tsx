import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, PgBtn, TiltCard, FormField } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";

interface Team {
  teamId: number;
  teamName: string;
  tag: string;
  logo: string;
  description: string | null;
}

interface TeamMemberInfo {
  playerId: number;
  gamerTag: string;
  fullName: string;
  role: string;
  joinedAt: string;
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
  const [membersModal, setMembersModal] = useState<{ teamId: number; teamName: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}teams`, { headers });
      const data = await res.json();
      setTeams(parseData<Team>(data));
    } catch {
      setError("Neuspešno učitavanje timova");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, [token]);

  const createTeam = async () => {
    if (!form.teamName || !form.tag) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}teams`, { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ teamName: "", tag: "", logo: "", description: "" });
        await loadTeams();
      } else setError(data.message);
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
              <motion.div key={t.teamId} variants={fadeUp}
                onClick={() => setMembersModal({ teamId: t.teamId, teamName: t.teamName })}
                style={{ cursor: "pointer" }}
                title="Klikni za detalje članova">
                <TiltCard glow={glow} style={{ padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, background: `${glow}1a`, border: `1px solid ${glow}45`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", boxShadow: `0 0 18px ${glow}30` }}>
                      {t.logo
                        ? <img src={t.logo} alt={t.tag} style={{ width: 54, height: 54, objectFit: "cover" }} />
                        : <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 900, color: glow }}>{t.tag?.slice(0, 2)}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{t.teamName}</p>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: glow }}>[{t.tag}]</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, minHeight: 38 }}>{t.description || "Nema opisa."}</p>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: glow, marginTop: 12, opacity: 0.7 }}>POGLEDAJ ČLANOVE →</p>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {membersModal && (
        <TeamMembersModal
          teamId={membersModal.teamId}
          teamName={membersModal.teamName}
          token={token ?? ""}
          onClose={() => setMembersModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Team Members Modal ─── */

function TeamMembersModal({ teamId, teamName, token, onClose }: {
  teamId: number;
  teamName: string;
  token: string;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${BASE}teams/${teamId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setMembers(data.data as TeamMemberInfo[]);
        else setError("Neuspešno učitavanje članova");
      } catch {
        setError("Greška pri učitavanju");
      } finally {
        setLoading(false);
      }
    };
    void fetchMembers();
  }, [teamId, token]);

  const captain = members.find(m => m.role === "captain");
  const others = members.filter(m => m.role !== "captain");

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="pg-glass"
          style={{ width: "100%", maxWidth: 440, borderRadius: 18, padding: 28, border: "1px solid var(--border-bright)" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Članovi tima</p>
              <p style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{teamName}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}><Spinner /></div>
          ) : error ? (
            <ErrorBox message={error} />
          ) : members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Nema članova.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {captain && <MemberRow member={captain} />}
              {others.map(m => <MemberRow key={m.playerId} member={m} />)}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function MemberRow({ member }: { member: TeamMemberInfo }) {
  const isCaptain = member.role === "captain";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: isCaptain ? "rgba(124,92,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isCaptain ? "rgba(124,92,255,0.25)" : "var(--border)"}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: isCaptain ? "rgba(124,92,255,0.18)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{isCaptain ? "👑" : "🎮"}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{member.gamerTag}</p>
        {member.fullName && <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>{member.fullName}</p>}
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isCaptain ? "var(--violet)" : "var(--text-dim)", background: isCaptain ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>
        {isCaptain ? "kapiten" : "član"}
      </span>
    </div>
  );
}
