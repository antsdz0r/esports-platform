import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IProTournamentService } from "../../Domain/services/pro/IProTournamentService";
import { IProStructureSyncService } from "../../Domain/services/pro/IProStructureSyncService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";

const SLUG = /^[a-z0-9-]{1,40}$/;
const ID = /^[A-Za-z0-9-]{1,60}$/;

export class ProTournamentController {
  private readonly router = Router();

  public constructor(
    private readonly tournamentService: IProTournamentService,
    private readonly structureSyncService: IProStructureSyncService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router.get("/pro/games", this.getGames.bind(this));
    this.router.get("/pro/games/:slug/leagues", this.getLeagues.bind(this));
    this.router.get("/pro/games/:slug/tournaments/active", this.getActive.bind(this));
    this.router.get("/pro/leagues/:id/series", this.getSeries.bind(this));
    this.router.get("/pro/series/:id/tournaments", this.getTournaments.bind(this));
    this.router.get("/pro/tournaments/:id", this.getTournamentDetail.bind(this));
    this.router.post("/pro/structure/sync", authenticate, authorize(UserRole.ADMIN), this.syncStructure.bind(this));
  }

  private async getGames(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await this.tournamentService.getGames() });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getLeagues(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug as string;
      if (!SLUG.test(slug)) { res.status(400).json({ success: false, message: "Invalid slug" }); return; }
      res.status(200).json({ success: true, data: await this.tournamentService.getLeagues(slug) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getActive(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug as string;
      if (!SLUG.test(slug)) { res.status(400).json({ success: false, message: "Invalid slug" }); return; }
      res.status(200).json({ success: true, data: await this.tournamentService.getActiveTournaments(slug) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getSeries(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!ID.test(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      res.status(200).json({ success: true, data: await this.tournamentService.getSeries(id) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getTournaments(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!ID.test(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      res.status(200).json({ success: true, data: await this.tournamentService.getTournaments(id) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getTournamentDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!ID.test(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const detail = await this.tournamentService.getTournamentDetail(id);
      if (!detail) { res.status(404).json({ success: false, message: "Turnir nije pronađen" }); return; }
      res.status(200).json({ success: true, data: detail });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async syncStructure(req: Request, res: Response): Promise<void> {
    try {
      const rawGame = (req.body?.game ?? req.query.game) as string | undefined;
      const games = rawGame && SLUG.test(rawGame) ? [rawGame] : undefined;
      const result = await this.structureSyncService.syncStructure(games);
      if (!result.ok) { res.status(502).json({ success: false, message: result.error ?? "Sync neuspešan" }); return; }
      await this.auditLogService.log(
        req.user?.id ?? null, "SYNC_PRO_STRUCTURE", "pro_tournament", null,
        `Struktura: ${result.leagues} liga, ${result.series} serija, ${result.tournaments} turnira`,
        req.socket.remoteAddress ?? null
      );
      res.status(200).json({ success: true, data: { leagues: result.leagues, series: result.series, tournaments: result.tournaments } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
