import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PgBtn, Spinner, ErrorBox, SuccessBox } from "../ui/UI";
import { streamApi } from "../../api_services/streams/StreamAPIService";
import type { MatchStream, StreamPlatform, StreamType } from "../../models/stream/StreamTypes";

interface StreamAdminModalProps {
  gameId: number;
  onClose: () => void;
}

const PLATFORMS: StreamPlatform[] = ["twitch", "youtube", "kick"];
const TYPES: { value: StreamType; label: string }[] = [
  { value: "official", label: "Official" },
  { value: "cocast", label: "Co-stream" },
  { value: "caster", label: "Caster" },
];

const CHANNEL_HINT: Record<StreamPlatform, string> = {
  twitch: "npr. esl_csgo (naziv kanala)",
  youtube: "npr. dQw4w9WgXcQ (video ID)",
  kick: "npr. trainwreckstv (naziv kanala)",
};

export default function StreamAdminModal({ gameId, onClose }: StreamAdminModalProps) {
  const [streams, setStreams] = useState<MatchStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [platform, setPlatform] = useState<StreamPlatform>("twitch");
  const [channel, setChannel] = useState("");
  const [type, setType] = useState<StreamType>("official");
  const [language, setLanguage] = useState("en");
  const [title, setTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await streamApi.getAllForMatch(gameId);
    if (res.success && res.data) setStreams(res.data);
    else setError(res.message ?? "Failed to load");
    setLoading(false);
  };

  useEffect(() => { void load(); }, [gameId]);

  const add = async () => {
    setError(""); setSuccess("");
    setSaving(true);
    const res = await streamApi.create(gameId, { platform, channel: channel.trim(), type, language: language.trim(), title: title.trim() || null });
    if (res.success) {
      setSuccess("Stream dodat.");
      setChannel(""); setTitle("");
      await load();
    } else {
      setError(res.message ?? "Failed to add");
    }
    setSaving(false);
  };

  const toggleActive = async (s: MatchStream) => {
    setBusyId(s.streamId);
    const res = await streamApi.update(s.streamId, {
      platform: s.platform, channel: s.channel, type: s.type,
      language: s.language, title: s.title, isActive: !s.isActive,
    });
    if (res.success) await load();
    else setError(res.message ?? "Update failed");
    setBusyId(null);
  };

  const remove = async (streamId: number) => {
    setBusyId(streamId);
    const res = await streamApi.remove(streamId);
    if (res.success) await load();
    else setError(res.message ?? "Failed to delete");
    setBusyId(null);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="pg-glass"
          style={{ width: "100%", maxWidth: 480, borderRadius: 16, padding: 26, display: "flex", flexDirection: "column", gap: 16, maxHeight: "88vh", overflowY: "auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Match #{gameId}</p>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Streams</h3>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>

          {success && <SuccessBox message={success} />}
          {error && <ErrorBox message={error} />}

          {/* Postojeći streamovi */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner /></div>
          ) : streams.length === 0 ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>No streams for this match yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {streams.map((s) => (
                <div key={s.streamId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", opacity: s.isActive ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {s.title?.trim() || TYPES.find(t => t.value === s.type)?.label}
                    </p>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>
                      {s.platform} · {s.channel} · {s.language.toUpperCase()}
                    </p>
                  </div>
                  <button
                    disabled={busyId === s.streamId}
                    onClick={() => void toggleActive(s)}
                    title={s.isActive ? "Hide (deactivate)" : "Show (activate)"}
                    style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${s.isActive ? "var(--green)" : "var(--border)"}`, background: s.isActive ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.03)", color: s.isActive ? "var(--green)" : "var(--text-dim)" }}>
                    {s.isActive ? "active" : "hidden"}
                  </button>
                  <button
                    disabled={busyId === s.streamId}
                    onClick={() => void remove(s.streamId)}
                    title="Delete"
                    style={{ background: "none", border: "1px solid var(--pink)", color: "var(--pink)", fontSize: 12, cursor: "pointer", padding: "3px 9px", borderRadius: 6 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Forma za dodavanje */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet2)" }}>Add stream</p>

            <div style={{ display: "flex", gap: 8 }}>
              <select className="pg-input" value={platform} onChange={(e) => setPlatform(e.target.value as StreamPlatform)} style={{ flex: 1 }}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="pg-input" value={type} onChange={(e) => setType(e.target.value as StreamType)} style={{ flex: 1 }}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <input className="pg-input" placeholder={CHANNEL_HINT[platform]} value={channel} onChange={(e) => setChannel(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />

            <div style={{ display: "flex", gap: 8 }}>
              <input className="pg-input" placeholder="Language (en, sr...)" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: 120, boxSizing: "border-box" }} />
              <input className="pg-input" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, boxSizing: "border-box" }} />
            </div>

            <PgBtn variant="primary" size="sm" disabled={saving || !channel.trim()} onClick={add}>
              {saving ? "Adding..." : "＋ Add stream"}
            </PgBtn>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
