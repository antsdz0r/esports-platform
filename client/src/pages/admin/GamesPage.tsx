import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import {
  PageHeader, Spinner, Empty, ErrorBox, SuccessBox,
  PgBtn, FormField, Table, TableHead,
} from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { useConfirm } from "../../components/ui/ConfirmDialog";

interface Game {
  gameId: number;
  name: string;
  tag: string;
  genre: string;
  maxPlayers: number;
  imageUrl: string | null;
}

interface GameForm {
  name: string;
  tag: string;
  genre: string;
  maxPlayers: string;
}

const EMPTY_FORM: GameForm = { name: "", tag: "", genre: "", maxPlayers: "" };
const BASE = import.meta.env.VITE_API_URL;
// Base for static assets served by Express (strip trailing slash from API url)
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(10,12,28,0.8)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontFamily: "var(--font-ui)",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

export default function GamesPage() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [form, setForm] = useState<GameForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGames = async () => {
    try {
      const res = await fetch(`${BASE}games`, { headers: authHeaders });
      const data = await res.json();
      setGames(data.success ? data.data : []);
    } catch {
      setError("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchGames(); }, [token]);

  const openCreate = () => {
    setEditGame(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (g: Game) => {
    setEditGame(g);
    setForm({ name: g.name, tag: g.tag, genre: g.genre, maxPlayers: String(g.maxPlayers) });
    setImageFile(null);
    setImagePreview(g.imageUrl ? `${STATIC_BASE}${g.imageUrl}` : null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditGame(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(editGame?.imageUrl ? `${STATIC_BASE}${editGame.imageUrl}` : null);
    }
  };

  const handleSave = async () => {
    const maxPlayers = parseInt(form.maxPlayers, 10);
    if (!form.name.trim() || !form.tag.trim() || !form.genre.trim() || isNaN(maxPlayers) || maxPlayers <= 0) {
      setError("All fields are required. Max players must be a positive number.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Use FormData so we can attach the image file
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("tag", form.tag.trim());
      fd.append("genre", form.genre.trim());
      fd.append("maxPlayers", String(maxPlayers));
      if (imageFile) fd.append("image", imageFile);

      const res = await fetch(
        editGame ? `${BASE}games/${editGame.gameId}` : `${BASE}games`,
        { method: editGame ? "PUT" : "POST", headers: authHeaders, body: fd }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Failed to save"); return; }
      setSuccess(editGame ? "Game updated!" : "Game created!");
      closeModal();
      await fetchGames();
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm({ variant: "danger", title: "Delete game", message: "Do you want to delete this game?", confirmText: "Yes, delete" }))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE}games/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Delete failed"); return; }
      setSuccess("Game deleted.");
      await fetchGames();
    } catch {
      setError("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Management"
        title="Games"
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/admin"><PgBtn variant="ghost" size="sm">← Dashboard</PgBtn></Link>
            <PgBtn variant="primary" size="sm" onClick={openCreate}>+ New game</PgBtn>
          </div>
        }
      />

      {success && <SuccessBox message={success} />}
      {error && !showModal && <ErrorBox message={error} />}

      {loading ? <Spinner /> : games.length === 0 ? (
        <Empty message="No games. Add your first game by clicking '+ New game'." />
      ) : (
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
          <Table>
            <TableHead columns={["Image", "Name", "Tag", "Genre", "Max players", "Actions"]} />
            <tbody>
              {games.map((g) => (
                <motion.tr key={g.gameId} variants={fadeUp}
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={tdStyle}>
                    {g.imageUrl ? (
                      <img
                        src={`${STATIC_BASE}${g.imageUrl}`}
                        alt={g.name}
                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(124,92,255,0.08)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        🎮
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{g.name}</span></td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(124,92,255,0.12)", color: "var(--violet2)", padding: "3px 8px", borderRadius: 5 }}>
                      {g.tag}
                    </span>
                  </td>
                  <td style={tdStyle}>{g.genre}</td>
                  <td style={tdStyle}>{g.maxPlayers}</td>
                  <td style={{ ...tdStyle, display: "flex", gap: 8, alignItems: "center" }}>
                    <PgBtn variant="ghost" size="sm" onClick={() => openEdit(g)}>Izmeni</PgBtn>
                    <PgBtn variant="danger" size="sm"
                      disabled={deletingId === g.gameId}
                      onClick={() => handleDelete(g.gameId)}>
                      {deletingId === g.gameId ? "..." : "Delete"}
                    </PgBtn>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </Table>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal title={editGame ? "Edit game" : "New game"} onClose={closeModal}>
            {error && <ErrorBox message={error} />}

            {/* Image picker */}
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
                Slika igre
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {/* Preview box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 96, height: 96, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                    border: `2px dashed ${imagePreview ? "var(--violet)" : "var(--border)"}`,
                    background: "rgba(10,12,28,0.6)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.2s",
                  }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 28 }}>📷</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <PgBtn variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? "Replace image" : "Choose image"}
                  </PgBtn>
                  {imageFile && (
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                      {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                  {!imageFile && editGame?.imageUrl && (
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                      The current image stays if you don&apos;t pick a new one.
                    </p>
                  )}
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>
                    JPG, PNG, WEBP · max 5 MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={onFileChange}
              />
            </div>

            <FormField label="Game name">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. League of Legends" />
            </FormField>
            <FormField label="Tag (short label)">
              <input style={inputStyle} value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. LOL" maxLength={10} />
            </FormField>
            <FormField label="Genre">
              <input style={inputStyle} value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="e.g. MOBA, FPS, RTS..." />
            </FormField>
            <FormField label="Max players per team">
              <input style={inputStyle} type="number" min={1} value={form.maxPlayers} onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))} placeholder="e.g. 5" />
            </FormField>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <PgBtn variant="ghost" size="sm" onClick={closeModal}>Cancel</PgBtn>
<PgBtn variant="primary" size="sm" disabled={saving} onClick={handleSave}>
                {saving ? "Saving..." : editGame ? "Save changes" : "Create game"}
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
        className="pg-glass"
        style={{ width: "100%", maxWidth: 480, padding: 32, borderRadius: 16, display: "flex", flexDirection: "column", gap: 18, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
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

const tdStyle: React.CSSProperties = { padding: "12px 16px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-ui)", verticalAlign: "middle" };
