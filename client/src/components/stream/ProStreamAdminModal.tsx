import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PgBtn, Spinner, ErrorBox, SuccessBox } from "../ui/UI";
import { proApi } from "../../api_services/pro/ProAPIService";
import type { ProStreamAdmin } from "../../models/pro/ProTypes";

type Platform = "twitch" | "youtube" | "kick";

const PLATFORMS: Platform[] = ["twitch", "youtube", "kick"];

const CHANNEL_HINT: Record<Platform, string> = {
  twitch: "npr. caedrel (naziv kanala)",
  youtube: "npr. dQw4w9WgXcQ (video ID)",
  kick: "npr. trainwreckstv (naziv kanala)",
};

// Rucno dodavanje kastera / co-streamova za pro mec. Automatski (pandascore)
// streamovi se prikazuju info-only; brise se samo 'local'.
export default function ProStreamAdminModal({ matchId, onClose, onChanged }: {
  matchId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [streams, setStreams] = useState<ProStreamAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [platform, setPlatform] = useState<Platform>("twitch");
  const [channel, setChannel] = useState("");
  const [language, setLanguage] = useState("en");

  const load = async () => {
    setLoading(true);
    const res = await proApi.getMatchStreams(matchId);
    if (res.success && res.data) setStreams(res.data);
    else setError(res.message ?? "Failed to load");
    setLoading(false);
  };

  useEffect(() => { void load(); }, [matchId]);

  const add = async () => {
    setError(""); setSuccess("");
    setSaving(true);
    const res = await proApi.addStream(matchId, { platform, channel: channel.trim(), language: language.trim() });
    if (res.success) {
      setSuccess("Caster added.");
      setChannel("");
      await load();
      onChanged();
    } else {
      setError(res.message ?? "Failed to add");
    }
    setSaving(false);
  };

  const remove = async (streamId: number) => {
    setError(""); setSuccess("");
    setBusyId(streamId);
    const res = await proApi.removeStream(streamId);
    if (res.success) {
      await load();
      onChanged();
    } else {
      setError(res.message ?? "Failed to delete");
    }
    setBusyId(null);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", zIndex: 100010, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="pg-glass"
          style={{ width: "100%", maxWidth: 480, borderRadius: 16, padding: 26, display: "flex", flexDirection: "column", gap: 16, maxHeight: "88vh", overflowY: "auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Pro match #{matchId}</p>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Casters and streams</h3>
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
              {streams.map((s) => {
                const isLocal = s.source === "local";
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                        {s.channel}
                      </p>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>
                        {s.platform} · {s.language.toUpperCase()}
                      </p>
                    </div>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 6, border: `1px solid ${isLocal ? "var(--cyan)" : "var(--border)"}`, background: isLocal ? "rgba(0,212,255,0.10)" : "rgba(255,255,255,0.03)", color: isLocal ? "var(--cyan)" : "var(--text-dim)" }}>
                      {isLocal ? "MANUAL" : "AUTO"}
                    </span>
                    {isLocal ? (
                      <button
                        disabled={busyId === s.id}
                        onClick={() => void remove(s.id)}
                        title="Delete"
                        style={{ background: "none", border: "1px solid var(--pink)", color: "var(--pink)", fontSize: 12, cursor: "pointer", padding: "3px 9px", borderRadius: 6 }}>
                        ✕
                      </button>
                    ) : (
                      <span title="Automatic from the source — removed on the next sync" style={{ color: "var(--text-dim)", fontSize: 13, padding: "0 4px" }}>🔒</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Forma za dodavanje */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet2)" }}>Add caster / stream</p>

            <div style={{ display: "flex", gap: 8 }}>
              <select className="pg-input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} style={{ flex: 1 }}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="pg-input" placeholder="Language (en, sr...)" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: 120, boxSizing: "border-box" }} />
            </div>

            <input className="pg-input" placeholder={CHANNEL_HINT[platform]} value={channel} onChange={(e) => setChannel(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />

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
