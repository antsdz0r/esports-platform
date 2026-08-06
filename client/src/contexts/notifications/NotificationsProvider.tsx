import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { proApi } from "../../api_services/pro/ProAPIService";
import type { ProMatch, ProMatchStatus } from "../../models/pro/ProTypes";

export interface Notif {
  id: string;
  matchId: number;
  title: string;
  sub: string;
  createdAt: number;
  read: boolean;
}

interface NotificationsCtx {
  isWatched: (matchId: number) => boolean;
  toggleWatch: (matchId: number) => void;
  watchCount: number;
  notifications: Notif[];
  unreadCount: number;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const DEFAULT: NotificationsCtx = {
  isWatched: () => false,
  toggleWatch: () => {},
  watchCount: 0,
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
};

const Ctx = createContext<NotificationsCtx | null>(null);

const GAME_LABELS: Record<string, string> = {
  "league-of-legends": "LoL", "cs-go": "CS2", "csgo": "CS2", "cs-2": "CS2", "cs2": "CS2",
  "dota-2": "Dota 2", "valorant": "Valorant", "rainbow-6-siege": "R6", "overwatch": "Overwatch",
};
const gameLabel = (s: string): string => GAME_LABELS[s] ?? s.replace(/-/g, " ");

// Kratak „chime" preko Web Audio API-ja (bez asset fajla). Browser blokira zvuk
// dok korisnik ne interaguje sa stranicom — tada je već dozvoljen; inače tiho padne.
function playChime(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ac = new Ctor();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ac.currentTime);
    o.frequency.setValueAtTime(1175, ac.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
    o.start();
    o.stop(ac.currentTime + 0.42);
    window.setTimeout(() => { void ac.close(); }, 600);
  } catch { /* autoplay policy / bez audio-a */ }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [watched, setWatched] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const prevStatus = useRef<Map<number, ProMatchStatus>>(new Map());
  const notified = useRef<Set<number>>(new Set());
  const watchedRef = useRef<Set<number>>(new Set());
  watchedRef.current = watched;

  // Učitaj watchlist na login / očisti na logout.
  useEffect(() => {
    if (!user) {
      setWatched(new Set());
      setNotifications([]);
      prevStatus.current.clear();
      notified.current.clear();
      return;
    }
    void proApi.getWatchlistIds().then((r) => {
      if (r.success && r.data) setWatched(new Set(r.data));
    });
  }, [user]);

  // Poll feed-a i detekcija prelaska watchlist-ovanog meča upcoming -> live.
  useEffect(() => {
    if (!user) return;
    let alive = true;

    const tick = async (): Promise<void> => {
      const r = await proApi.getMatches(200);
      if (!alive || !r.success || !r.data) return;
      const w = watchedRef.current;
      if (w.size === 0) return;
      const feed: ProMatch[] = r.data;
      const fresh: Notif[] = [];
      for (const m of feed) {
        if (!w.has(m.id)) continue;
        const prev = prevStatus.current.get(m.id);
        // prev===undefined = prvo viđenje (samo inicijalizuj, ne notifikuj)
        if (prev !== undefined && prev !== "live" && m.status === "live" && !notified.current.has(m.id)) {
          notified.current.add(m.id);
          fresh.push({
            id: `live-${m.id}`,
            matchId: m.id,
            title: `${m.team1Name ?? "TBD"} vs ${m.team2Name ?? "TBD"} is live`,
            sub: `${gameLabel(m.gameSlug)}${m.leagueName ? " · " + m.leagueName : ""}`,
            createdAt: Date.now(),
            read: false,
          });
        }
        prevStatus.current.set(m.id, m.status);
      }
      if (fresh.length > 0) {
        setNotifications((prevN) => [...fresh, ...prevN].slice(0, 40));
        playChime();
      }
    };

    void tick();
    const id = window.setInterval(() => { void tick(); }, 30000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user]);

  const isWatched = useCallback((matchId: number) => watched.has(matchId), [watched]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const toggleWatch = useCallback((matchId: number) => {
    const next = !watchedRef.current.has(matchId);
    setWatched((prev) => { const s = new Set(prev); if (next) s.add(matchId); else s.delete(matchId); return s; });
    if (!next) { prevStatus.current.delete(matchId); notified.current.delete(matchId); }
    const call = next ? proApi.addToWatchlist(matchId) : proApi.removeFromWatchlist(matchId);
    void call.then((r) => {
      if (!r.success) {
        setWatched((prev) => { const s = new Set(prev); if (next) s.delete(matchId); else s.add(matchId); return s; });
        showToast(next ? "Failed to add to watchlist" : "Failed to remove from watchlist");
      } else {
        showToast(next ? "Added to watchlist" : "Removed from watchlist");
      }
    });
  }, [showToast]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.reduce((c, n) => c + (n.read ? 0 : 1), 0);

  return (
    <Ctx.Provider value={{ isWatched, toggleWatch, watchCount: watched.size, notifications, unreadCount, markAllRead, dismiss }}>
      {children}
      {toast && createPortal(
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100002,
          background: "rgba(10,14,30,0.96)", border: "1px solid var(--cyan)", color: "#eafcff",
          padding: "11px 20px", borderRadius: 11, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 9, boxShadow: "0 10px 34px rgba(0,0,0,0.5), 0 0 18px rgba(0,212,255,0.32)" }}>
          <span style={{ fontSize: 15 }}>🔔</span> {toast}
        </div>, document.body)}
    </Ctx.Provider>
  );
}

export function useNotifications(): NotificationsCtx {
  return useContext(Ctx) ?? DEFAULT;
}
