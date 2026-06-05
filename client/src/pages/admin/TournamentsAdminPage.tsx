import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import {
  PageHeader, Spinner, Empty, ErrorBox, SuccessBox,
  PgBtn, FormField, StatusBadge, Table, TableHead,
} from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Game { gameId: number; name: string; }
interface Tournament {
  tournamentId: number;
  name: string;
  format: string;
  maxTeams: number;
  status: string;
  prizePool: number;
  registrationDeadline: string;
  gameName?: string;
  gameId?: number;
  registeredCount?: number;
}

interface TournamentForm {
  name: string;
  gameId: string;
  format: string;
  maxTeams: string;
  registrationDeadline: string;
  prizePool: string;
  status: string;
}

const EMPTY_FORM: TournamentForm = {
  name: "", gameId: "", format: "single_elim", maxTeams: "8",
  registrationDeadline: "", prizePool: "0", status: "open",
};

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elimination",
  double_elim: "Double Elimination",
  round_robin: "Round Robin",
};

const STATUS_OPTIONS = ["open", "ongoing", "locked", "completed"];
const BASE = import.meta.env.VITE_API_URL;

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(10,12,28,0.8)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontFamily: "var(--font-ui)",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer",
};

export default function TournamentsAdminPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState<TournamentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [tRes, gRes] = await Promise.all([
        fetch(`${BASE}tournaments`, { headers }),
        fetch(`${BASE}games`, { headers }),
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      setTournaments(tData.success ? tData.data : []);
      setGames(gData.success ? gData.data : []);
    } catch {
      setError("Neuspešno učitavanje");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, [token]);

  const toLocalDatetimeInput = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreate = () => {
    setEditTournament(null);
    const tomorrow = new Date(Date.now() + 86_400_000);
    setForm({ ...EMPTY_FORM, registrationDeadline: toLocalDatetimeInput(tomorrow.toISOString()), gameId: games[0] ? String(games[0].gameId) : "" });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    setEditTournament(t);
    setForm({
      name: t.name,
      gameId: t.gameId ? String(t.gameId) : "",
      format: t.format,
      maxTeams: String(t.maxTeams),
      registrationDeadline: toLocalDatetimeInput(t.registrationDeadline),
      prizePool: String(t.prizePool),
      status: t.status,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTournament(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    const maxTeams = parseInt(form.maxTeams, 10);
    const gameId = parseInt(form.gameId, 10);
    const prizePool = parseFloat(form.prizePool) || 0;
    if (!form.name.trim() || isNaN(gameId) || !form.format || isNaN(maxTeams) || maxTeams < 2 || !form.registrationDeadline) {
      setError("Sva polja su obavezna. Min 2 tima.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        gameId,
        format: form.format,
        maxTeams,
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        prizePool,
        ...(editTournament ? { status: form.status } : {}),
      };
      const res = await fetch(
        editTournament ? `${BASE}tournaments/${editTournament.tournamentId}` : `${BASE}tournaments`,
        { method: editTournament ? "PUT" : "POST", headers, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Greška pri snimanju"); return; }
      setSuccess(editTournament ? "Turnir ažuriran!" : "Turnir kreiran!");
      closeModal();
      await fetchData();
    } catch {
      setError("Greška pri snimanju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Obrisati ovaj turnir? Ovo briše i sve prijave i mečeve!")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE}tournaments/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Brisanje neuspešno"); return; }
      setSuccess("Turnir obrisan.");
      await fetchData();
    } catch {
      setError("Greška pri brisanju");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateBracket = async (id: number) => {
    if (!confirm("Generisati bracket? Prijave se zaključavaju.")) return;
    try {
      const res = await fetch(`${BASE}tournaments/${id}/generate-bracket`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Bracket generisanje neuspešno"); return; }
      setSuccess("Bracket generisan!");
      await fetchData();
    } catch {
      setError("Greška pri generisanju bracketa");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Upravljanje"
        title="Turniri"
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/admin"><PgBtn variant="ghost" size="sm">← Dashboard</PgBtn></Link>
            <Link to="/admin/games"><PgBtn variant="ghost" size="sm">🎮 Igre</PgBtn></Link>
            <PgBtn variant="primary" size="sm" onClick={openCreate} disabled={games.length === 0}>
              {games.length === 0 ? "Dodaj igru prvo" : "+ Novi turnir"}
            </PgBtn>
          </div>
        }
      />

      {success && <SuccessBox message={success} />}
      {error && !showModal && <ErrorBox message={error} />}

      {loading ? <Spinner /> : tournaments.length === 0 ? (
        <Empty message="Nema turnira. Klikni '+ Novi turnir' da kreiraš prvi." />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
          <Table>
            <TableHead columns={["Naziv", "Igra", "Format", "Timovi", "Status", "Nagrada", "Rok prijave", "Akcije"]} />
            <tbody>
              {tournaments.map((t) => (
                <motion.tr key={t.tournamentId} variants={fadeUp}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  onClick={() => navigate(`/admin/tournaments/${t.tournamentId}`)}>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{t.name}</span></td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, background: "rgba(0,229,255,0.08)", color: "var(--cyan)", padding: "3px 8px", borderRadius: 5 }}>
                      {t.gameName ?? "—"}
                    </span>
                  </td>
                  <td style={tdStyle}>{FORMAT_LABEL[t.format] ?? t.format}</td>
                  <td style={tdStyle}>{t.registeredCount ?? 0}/{t.maxTeams}</td>
                  <td style={tdStyle}><StatusBadge status={t.status} /></td>
                  <td style={tdStyle}>{t.prizePool > 0 ? <span style={{ color: "var(--gold)", fontWeight: 700 }}>${t.prizePool}</span> : "—"}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--text-dim)" }}>{new Date(t.registrationDeadline).toLocaleDateString("sr")}</td>
                  <td style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <PgBtn variant="ghost" size="sm" onClick={() => openEdit(t)}>Izmeni</PgBtn>
                      {t.status === "open" && (
                        <PgBtn variant="cyan" size="sm" onClick={() => handleGenerateBracket(t.tournamentId)}>Bracket</PgBtn>
                      )}
                      <PgBtn variant="danger" size="sm" disabled={deletingId === t.tournamentId} onClick={() => handleDelete(t.tournamentId)}>
                        {deletingId === t.tournamentId ? "..." : "Briši"}
                      </PgBtn>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal title={editTournament ? "Izmeni turnir" : "Novi turnir"} onClose={closeModal}>
            {error && <ErrorBox message={error} />}
            <FormField label="Naziv turnira">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="npr. Spring Championship 2026" />
            </FormField>
            <FormField label="Igra">
              <select style={selectStyle} value={form.gameId} onChange={e => setForm(f => ({ ...f, gameId: e.target.value }))}>
                <option value="">— Izaberi igru —</option>
                {games.map(g => <option key={g.gameId} value={g.gameId}>{g.name}</option>)}
              </select>
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="Format">
                <select style={selectStyle} value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                  <option value="single_elim">Single Elimination</option>
                  <option value="double_elim">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                </select>
              </FormField>
              <FormField label="Max timova">
                <input style={inputStyle} type="number" min={2} value={form.maxTeams} onChange={e => setForm(f => ({ ...f, maxTeams: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Rok prijave">
              <input style={inputStyle} type="datetime-local" value={form.registrationDeadline} onChange={e => setForm(f => ({ ...f, registrationDeadline: e.target.value }))} />
            </FormField>
            <FormField label="Nagradni fond ($)">
              <input style={inputStyle} type="number" min={0} value={form.prizePool} onChange={e => setForm(f => ({ ...f, prizePool: e.target.value }))} placeholder="0" />
            </FormField>
            {editTournament && (
              <FormField label="Status">
                <select style={selectStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <PgBtn variant="ghost" size="sm" onClick={closeModal}>Otkaži</PgBtn>
              <PgBtn variant="primary" size="sm" disabled={saving} onClick={handleSave}>
                {saving ? "Snimanje..." : editTournament ? "Sačuvaj izmene" : "Kreiraj turnir"}
              </PgBtn>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 20px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
        className="pg-glass" style={{ width: "100%", maxWidth: 520, padding: 32, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}

const tdStyle: React.CSSProperties = { padding: "14px 16px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-ui)", verticalAlign: "middle" };
