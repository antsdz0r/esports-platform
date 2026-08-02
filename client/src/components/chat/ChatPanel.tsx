import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useChat, type ChatMsg } from "../../hooks/chat/useChatHook";

// Boja nadimka deterministicki iz imena (da svako ima svoju).
function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 70%, 68%)`;
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ matchId, active, canSend, isAdmin, style }: {
  matchId: string | null;
  active: boolean;
  canSend: boolean;
  isAdmin: boolean;
  style?: CSSProperties;
}) {
  const { messages, status, error, send, remove } = useChat(matchId, active);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = (): void => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const submit = (): void => {
    const t = text.trim();
    if (!t) return;
    send(t);
    setText("");
    atBottomRef.current = true;
  };

  const statusColor = status === "open" ? "var(--green)" : status === "connecting" ? "var(--gold)" : "var(--text-dim)";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "rgba(10,13,28,0.6)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", ...style }}>
      {/* header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
        <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Live chat</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-dim)" }}>
          {status === "open" ? "connected" : status === "connecting" ? "connecting…" : "disconnected"}
        </span>
      </div>

      {/* poruke */}
      <div ref={listRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        {messages.length === 0 ? (
          <div style={{ margin: "auto", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>No messages yet. Be the first!</div>
        ) : messages.map((m: ChatMsg) => (
          <div key={m.id} style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.4, wordBreak: "break-word" }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", marginRight: 6 }}>{hhmm(m.createdAt)}</span>
            <span style={{ fontWeight: 800, color: nameColor(m.gamerTag) }}>{m.gamerTag}</span>
            <span style={{ color: "var(--text-muted)" }}>: </span>
            <span style={{ color: "var(--text)" }}>{m.message}</span>
            {isAdmin && (
              <button onClick={() => remove(m.id)} title="Delete message" style={{ marginLeft: 6, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 11 }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ flexShrink: 0, padding: "4px 12px", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--pink)" }}>{error}</div>
      )}

      {/* input */}
      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: 10 }}>
        {canSend ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
              maxLength={500}
              placeholder="Write a message…"
              style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontFamily: "var(--font-ui)", fontSize: 13, outline: "none" }}
            />
            <button onClick={submit} disabled={status !== "open"}
              style={{ flexShrink: 0, background: "var(--cyan)", border: "none", borderRadius: 8, padding: "8px 14px", color: "#00131a", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, cursor: status === "open" ? "pointer" : "not-allowed", opacity: status === "open" ? 1 : 0.5 }}>
              Send
            </button>
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "4px 0" }}>Log in to chat.</div>
        )}
      </div>
    </div>
  );
}
