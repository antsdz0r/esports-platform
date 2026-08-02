import { useCallback, useEffect, useRef, useState } from "react";
import { readItem } from "../../helpers/local_storage";

export interface ChatMsg {
  id: number;
  userId: number | null;
  gamerTag: string;
  message: string;
  createdAt: string;
}

export type ChatStatus = "connecting" | "open" | "closed";

const API = import.meta.env.VITE_API_URL as string;            // npr. http://localhost:3000/api/ (moze ici kroz LB)
const WS_BASE = import.meta.env.VITE_WS_URL as string | undefined; // npr. ws://localhost:4000 — DIREKTNO na API (mimo LB)

// WS mora direktno na API node (load-balancer ne prosledjuje WebSocket upgrade,
// a sobe su u memoriji jednog node-a). Ako je VITE_WS_URL postavljen, koristi njega;
// inace izvedi iz VITE_API_URL (radi samo ako API nije iza LB-a).
function wsUrl(matchId: string, token: string | null): string {
  const src = WS_BASE ?? API;
  const u = new URL(src);
  const proto = (u.protocol === "wss:" || u.protocol === "https:") ? "wss:" : "ws:";
  const q = new URLSearchParams({ matchId });
  if (token) q.set("token", token);
  return `${proto}//${u.host}/ws/chat?${q.toString()}`;
}

interface Incoming {
  type: string;
  data?: ChatMsg | ChatMsg[];
  message?: string;
  id?: number;
}

// WebSocket klijent za chat jednog meca. Auto-reconnect, istorija na konekciju.
export function useChat(matchId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);

  useEffect(() => {
    if (!enabled || !matchId) return;
    manualCloseRef.current = false;
    setMessages([]);

    const connect = (): void => {
      setStatus("connecting");
      const token = readItem("authToken");
      let ws: WebSocket;
      try { ws = new WebSocket(wsUrl(matchId, token)); }
      catch { setStatus("closed"); return; }
      wsRef.current = ws;

      ws.onopen = () => { if (wsRef.current === ws) setStatus("open"); };
      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return; // ignoriši staru/duplu konekciju (StrictMode)
        let p: Incoming;
        try { p = JSON.parse(ev.data as string) as Incoming; } catch { return; }
        if (p.type === "history" && Array.isArray(p.data)) {
          setMessages(p.data);
        } else if (p.type === "message" && p.data && !Array.isArray(p.data)) {
          const m = p.data;
          setMessages((prev) => [...prev, m].slice(-250));
        } else if (p.type === "deleted" && typeof p.id === "number") {
          const delId = p.id;
          setMessages((prev) => prev.filter((x) => x.id !== delId));
        } else if (p.type === "error" && p.message) {
          setError(p.message);
          window.setTimeout(() => setError(""), 2600);
        }
      };
      ws.onclose = () => {
        if (wsRef.current !== ws) return; // stara konekcija — ne diraj status ni reconnect
        setStatus("closed");
        if (!manualCloseRef.current) reconnectRef.current = window.setTimeout(connect, 2000);
      };
      ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
    };

    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch { /* ignore */ }
    };
  }, [matchId, enabled]);

  const send = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "message", text }));
  }, []);

  const remove = useCallback((id: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "delete", id }));
  }, []);

  return { messages, status, error, send, remove };
}
