import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IProMatchService } from "../../Domain/services/pro/IProMatchService";
import { IProSyncService } from "../../Domain/services/pro/IProSyncService";
import { IProStreamAdminService } from "../../Domain/services/pro/IProStreamAdminService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { validateProStream } from "../validators/pro/validateProStream";
import { StreamPlatform } from "../../Domain/enums/StreamPlatform";

export class ProController {
  private readonly router = Router();

  public constructor(
    private readonly proMatchService: IProMatchService,
    private readonly proSyncService: IProSyncService,
    private readonly proStreamAdminService: IProStreamAdminService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router.get("/pro/matches", this.getFeed.bind(this));
    this.router.post("/pro/sync", authenticate, authorize(UserRole.ADMIN), this.sync.bind(this));
    this.router.get("/pro/matches/:id/streams", authenticate, authorize(UserRole.ADMIN), this.listStreams.bind(this));
    this.router.post("/pro/matches/:id/streams", authenticate, authorize(UserRole.ADMIN), this.addStream.bind(this));
    this.router.delete("/pro/streams/:streamId", authenticate, authorize(UserRole.ADMIN), this.removeStream.bind(this));
  }

  private async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 40));
      const matches = await this.proMatchService.getFeed(limit);
      res.status(200).json({ success: true, data: matches });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async sync(req: Request, res: Response): Promise<void> {
    try {
      const rawGame = (req.body?.game ?? req.query.game) as string | undefined;
      const gameSlug = rawGame && /^[a-z0-9-]{2,40}$/.test(rawGame) ? rawGame : undefined;

      const result = await this.proSyncService.sync(gameSlug);
      if (!result.ok) {
        res.status(502).json({ success: false, message: result.error ?? "Sync failed" });
        return;
      }

      await this.auditLogService.log(
        req.user?.id ?? null, "SYNC_PRO", "pro_match", null,
        `Synced ${result.synced} pro matches${gameSlug ? ` (${gameSlug})` : ""}`,
        req.socket.remoteAddress ?? null
      );
      res.status(200).json({ success: true, data: { synced: result.synced } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async listStreams(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.id as string, 10);
      if (isNaN(matchId)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const streams = await this.proStreamAdminService.listForMatch(matchId);
      res.status(200).json({ success: true, data: streams });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async addStream(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.id as string, 10);
      if (isNaN(matchId)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }

      const { platform, channel, language } = req.body;
      const validation = validateProStream(platform, channel, language);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }

      const created = await this.proStreamAdminService.addLocal(
        matchId, platform as StreamPlatform, (channel as string).trim(), (language as string).trim()
      );
      if (!created.ok) { res.status(400).json({ success: false, message: created.error ?? "Failed to add" }); return; }

      await this.auditLogService.log(req.user?.id ?? null, "CREATE_PRO_STREAM", "pro_stream", created.stream?.id ?? null, `Added caster for pro match #${matchId}`, req.socket.remoteAddress ?? null);
      res.status(201).json({ success: true, data: created.stream });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async removeStream(req: Request, res: Response): Promise<void> {
    try {
      const streamId = parseInt(req.params.streamId as string, 10);
      if (isNaN(streamId)) { res.status(400).json({ success: false, message: "Invalid streamId" }); return; }
      const ok = await this.proStreamAdminService.removeLocal(streamId);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "DELETE_PRO_STREAM", "pro_stream", streamId, `Deleted pro stream #${streamId}`, req.socket.remoteAddress ?? null);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Stream deleted" : "Stream not found or not local" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
