import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IProMatchService } from "../../Domain/services/pro/IProMatchService";
import { IProSyncService } from "../../Domain/services/pro/IProSyncService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";

export class ProController {
  private readonly router = Router();

  public constructor(
    private readonly proMatchService: IProMatchService,
    private readonly proSyncService: IProSyncService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router.get("/pro/matches", this.getFeed.bind(this));
    this.router.post("/pro/sync", authenticate, authorize(UserRole.ADMIN), this.sync.bind(this));
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
        res.status(502).json({ success: false, message: result.error ?? "Sinhronizacija neuspešna" });
        return;
      }

      await this.auditLogService.log(
        req.user?.id ?? null, "SYNC_PRO", "pro_match", null,
        `Sinhronizovano ${result.synced} pro mečeva${gameSlug ? ` (${gameSlug})` : ""}`,
        req.socket.remoteAddress ?? null
      );
      res.status(200).json({ success: true, data: { synced: result.synced } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
