import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { IChatService } from "../../Domain/services/chat/IChatService";
import { ILoggerService } from "../../Domain/services/logger/ILoggerService";
import { JwtPayload } from "../../Domain/types/JwtPayload";
import { UserRole } from "../../Domain/enums/UserRole";

interface ChatUser { id: number; gamerTag: string; role: UserRole; }
interface ClientCtx {
  user: ChatUser | null; // null = gost (samo cita)
  matchId: string;
  lastSentAt: number;
  alive: boolean;
}

// WebSocket „gateway" za chat — analogno kontroleru, ali za /ws/chat.
// Jedna soba po mecu (external_id). Auth preko JWT-a iz query stringa (?token=).
export class ChatGateway {
  private wss: WebSocketServer | null = null;
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly ctx = new Map<WebSocket, ClientCtx>();
  private readonly RATE_MS = 900;                 // ~1 poruka/sekundi po korisniku
  private readonly ID_RE = /^[A-Za-z0-9-]{1,60}$/; // format external_id-a meca

  public constructor(
    private readonly chatService: IChatService,
    private readonly logger: ILoggerService,
    private readonly secret: string,
    private readonly allowedOrigin: string, // CLIENT_URL; prazno ili "*" = dozvoli sve (dev)
  ) {}

  // Prod: prima WS samo sa dozvoljenog origin-a. Dev (prazno/"*") propušta sve.
  private originAllowed(origin: string | undefined): boolean {
    if (!this.allowedOrigin || this.allowedOrigin === "*") return true;
    return origin === this.allowedOrigin;
  }

  public attach(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: "/ws/chat" });
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => this.onConnection(ws, req));

    // Heartbeat: obori mrtve konekcije da soba ostane cista.
    setInterval(() => {
      for (const [ws, c] of this.ctx) {
        if (!c.alive) { ws.terminate(); continue; }
        c.alive = false;
        try { ws.ping(); } catch { /* ignore */ }
      }
    }, 30000);

    this.logger.info("ChatGateway", "WebSocket chat aktivan na /ws/chat");
  }

  private onConnection(ws: WebSocket, req: IncomingMessage): void {
    if (!this.originAllowed(req.headers.origin)) { ws.close(1008, "Origin not allowed"); return; }

    let matchId = "";
    let token: string | null = null;
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      matchId = url.searchParams.get("matchId") ?? "";
      token = url.searchParams.get("token");
    } catch { /* ignore */ }

    if (!this.ID_RE.test(matchId)) { ws.close(1008, "Invalid matchId"); return; }

    const c: ClientCtx = { user: this.verify(token), matchId, lastSentAt: 0, alive: true };
    this.ctx.set(ws, c);
    this.join(matchId, ws);

    ws.on("pong", () => { c.alive = true; });
    ws.on("message", (raw) => { void this.onMessage(ws, c, raw.toString()); });
    ws.on("close", () => { this.leave(c.matchId, ws); this.ctx.delete(ws); });
    ws.on("error", () => { /* ignore — close ce ocistiti */ });

    // Posalji istoriju samo ovom klijentu.
    void this.chatService.history(matchId, 50).then((msgs) => {
      this.sendTo(ws, { type: "history", data: msgs });
    });
  }

  private async onMessage(ws: WebSocket, c: ClientCtx, raw: string): Promise<void> {
    if (raw.length > 4000) return; // grubi zastitni limit na sirov payload
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    if (typeof parsed !== "object" || parsed === null) return;
    const msg = parsed as { type?: unknown; text?: unknown; id?: unknown };

    if (msg.type === "message") {
      if (!c.user) { this.sendTo(ws, { type: "error", message: "Log in to send messages." }); return; }
      const now = Date.now();
      if (now - c.lastSentAt < this.RATE_MS) { this.sendTo(ws, { type: "error", message: "Uspori malo…" }); return; }
      const text = typeof msg.text === "string" ? msg.text : "";
      const res = await this.chatService.post(c.matchId, c.user.id, c.user.gamerTag, text);
      if (!res.ok || !res.message) { this.sendTo(ws, { type: "error", message: res.error ?? "Failed to send" }); return; }
      c.lastSentAt = now;
      this.broadcast(c.matchId, { type: "message", data: res.message });
      return;
    }

    if (msg.type === "delete") {
      if (c.user?.role !== UserRole.ADMIN) return;
      const id = Number(msg.id);
      if (!Number.isInteger(id)) return;
      const ok = await this.chatService.deleteMessage(id);
      if (ok) this.broadcast(c.matchId, { type: "deleted", id });
      return;
    }
  }

  private verify(token: string | null): ChatUser | null {
    if (!token || !this.secret) return null;
    try {
      const d = jwt.verify(token, this.secret) as JwtPayload;
      return { id: d.id, gamerTag: d.gamerTag, role: d.role as UserRole };
    } catch {
      return null;
    }
  }

  private join(room: string, ws: WebSocket): void {
    let set = this.rooms.get(room);
    if (!set) { set = new Set(); this.rooms.set(room, set); }
    set.add(ws);
  }

  private leave(room: string, ws: WebSocket): void {
    const set = this.rooms.get(room);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) this.rooms.delete(room);
  }

  private broadcast(room: string, payload: unknown): void {
    const set = this.rooms.get(room);
    if (!set) return;
    const data = JSON.stringify(payload);
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) { try { ws.send(data); } catch { /* ignore */ } }
    }
  }

  private sendTo(ws: WebSocket, payload: unknown): void {
    if (ws.readyState === ws.OPEN) { try { ws.send(JSON.stringify(payload)); } catch { /* ignore */ } }
  }
}
