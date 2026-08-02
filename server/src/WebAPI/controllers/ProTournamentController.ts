import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IProTournamentService } from "../../Domain/services/pro/IProTournamentService";
import { IProStructureSyncService } from "../../Domain/services/pro/IProStructureSyncService";
import { IProFavoriteService } from "../../Domain/services/pro/IProFavoriteService";
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
    private readonly favoriteService: IProFavoriteService,
  ) {
    this.router.get("/pro/games", this.getGames.bind(this));
    this.router.get("/pro/games/:slug/leagues", this.getLeagues.bind(this));
    this.router.get("/pro/games/:slug/tournaments/active", this.getActive.bind(this));
    this.router.get("/pro/leagues/:id/series", this.getSeries.bind(this));
    this.router.get("/pro/series/:id/tournaments", this.getTournaments.bind(this));
    // Favoriti (pre /pro/tournaments/:id da se ne poklopi ruta)
    this.router.get("/pro/favorites", authenticate, this.listFavorites.bind(this));
    this.router.get("/pro/favorites/ids", authenticate, this.listFavoriteIds.bind(this));
    this.router.post("/pro/favorites/:id", authenticate, this.addFavorite.bind(this));
    this.router.delete("/pro/favorites/:id", authenticate, this.removeFavorite.bind(this));
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
      if (!detail) { res.status(404).json({ success: false, message: "Tournament not found" }); return; }
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
      if (!result.ok) { res.status(502).json({ success: false, message: result.error ?? "Sync failed" }); return; }
      await this.auditLogService.log(
        req.user?.id ?? null, "SYNC_PRO_STRUCTURE", "pro_tournament", null,
        `Structure: ${result.leagues} leagues, ${result.series} series, ${result.tournaments} tournaments`,
        req.socket.remoteAddress ?? null
      );
      res.status(200).json({ success: true, data: { leagues: result.leagues, series: result.series, tournaments: result.tournaments } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async listFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      res.status(200).json({ success: true, data: await this.favoriteService.listFavorites(userId) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async listFavoriteIds(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      res.status(200).json({ success: true, data: await this.favoriteService.listIds(userId) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async addFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const id = req.params.id as string;
      if (!ID.test(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      await this.favoriteService.add(userId, id);
      res.status(201).json({ success: true, message: "Dodato u omiljene" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async removeFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const id = req.params.id as string;
      if (!ID.test(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      await this.favoriteService.remove(userId, id);
      res.status(200).json({ success: true, message: "Uklonjeno iz omiljenih" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
