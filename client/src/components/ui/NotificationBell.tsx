import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../../contexts/notifications/NotificationsProvider";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const handleToggle = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      markAllRead();
    }
    setOpen(o => !o);
  };

  const count = unreadCount;

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
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Notifications</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
                    You&apos;re all caught up 🎉
                  </div>
                ) : (
                  <div style={{ maxHeight: 380, overflowY: "auto" }}>
                    {notifications.map((n) => (
                      <div key={n.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 15 }}>🔴</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</p>
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>{n.sub}</p>
                        </div>
                        <button onClick={() => dismiss(n.id)} title="Dismiss" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 13 }}>✕</button>
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
