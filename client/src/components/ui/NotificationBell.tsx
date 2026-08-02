import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";

interface Invite {
  id: number;
  teamId: number;
  teamName: string | null;
  inviterId: number;
  status: string;
  createdAt: string;
}

const BASE = import.meta.env.VITE_API_URL;

export function NotificationBell() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState<number | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const fetchInvites = async () => {
    try {
      const res = await fetch(`${BASE}teams/invites/my`, { headers });
      const data = await res.json();
      if (data.success) setInvites(data.data ?? []);
    } catch {}
  };

  useEffect(() => { void fetchInvites(); }, [token]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(() => void fetchInvites(), 30_000);
    return () => clearInterval(id);
  }, [token]);

  const handleToggle = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  };

  const respond = async (inviteId: number, teamId: number, accept: boolean) => {
    setResponding(inviteId);
    try {
      await fetch(`${BASE}teams/${teamId}/invite/respond`, {
        method: "POST", headers, body: JSON.stringify({ inviteId, accept }),
      });
      await fetchInvites();
    } finally {
      setResponding(null);
    }
  };

  const count = invites.length;

  return (
    <>
      <button ref={bellRef} onClick={handleToggle}
        style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: count > 0 ? "var(--gold)" : "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4, transition: "color 0.2s" }}>
        🔔
        {count > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{ position: "absolute", top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: "var(--pink)", color: "#fff", fontSize: 10, fontWeight: 900, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxShadow: "0 0 8px var(--glow-pink)" }}>
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99990 }} onClick={() => setOpen(false)} />
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className="pg-glass"
                style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 99999, width: 320, borderRadius: 14, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Invites</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-muted)" }}>{count} pending</span>
                </div>
                {count === 0 ? (
                  <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
                    No new invites 🎉
                  </div>
                ) : (
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {invites.map(inv => (
                      <div key={inv.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div>
                          <p style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                            {inv.teamName ?? `Team #${inv.teamId}`}
                          </p>
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>
                            Invited {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={responding === inv.id}
                            onClick={() => respond(inv.id, inv.teamId, true)}
                            style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "linear-gradient(120deg, var(--violet), var(--cyan))", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {responding === inv.id ? "..." : "✓ Accept"}
                          </button>
                          <button
                            disabled={responding === inv.id}
                            onClick={() => respond(inv.id, inv.teamId, false)}
                            style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
