import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, token, logout, updateProfilePicture } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${BASE}users/me/avatar`, { method: "POST", headers, body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) { setMsg("Upload failed"); return; }
      updateProfilePicture(data.data.profilePicture);
      setMsg("Image changed successfully!");
    } catch {
      setMsg("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = user?.profilePicture
    ? (user.profilePicture.startsWith("http") ? user.profilePicture : `${STATIC_BASE}${user.profilePicture}`)
    : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="pg-glass"
            style={{ width: "100%", maxWidth: 400, padding: 32, borderRadius: 20, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Profile</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden", cursor: "pointer", border: "2px solid var(--violet)", boxShadow: "0 0 20px rgba(124,92,255,0.3)", position: "relative" }}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--violet), var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900, color: "#fff" }}>
                        {user?.username?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {uploading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent, var(--violet))", animation: "spin 0.8s linear infinite" }} />
                    </div>
                  )}
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: "50%", background: "var(--violet)", border: "2px solid var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12 }}>
                  📷
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>Click the image to change it</p>
              {msg && <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: msg.includes("failed") ? "var(--pink)" : "var(--green)" }}>{msg}</p>}
            </div>

            {/* Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Gamer tag", value: user?.username },
                { label: "Role", value: user?.role },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(124,92,255,0.05)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={() => { logout(); onClose(); window.location.href = "/login"; }}
              style={{ padding: "11px", borderRadius: 10, border: "1px solid rgba(255,45,126,0.3)", background: "rgba(255,45,126,0.06)", color: "var(--pink)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
              Log out →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
