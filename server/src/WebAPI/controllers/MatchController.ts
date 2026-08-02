import { Request, Response, Router } from "express";
import { IMatchService } from "../../Domain/services/matches/IMatchService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { UserRole } from "../../Domain/enums/UserRole";
import { GameStatus } from "../../Domain/enums/GameStatus";

export class MatchController {
  private readonly router = Router();

  public constructor(private readonly matchService: IMatchService) {
    this.router.get("/matches/scheduled", this.getScheduled.bind(this));
    this.router.get("/matches/my/wins", authenticate, this.getMyWins.bind(this));
    this.router.get("/matches/tournament/:tournamentId", this.getByTournament.bind(this));
    this.router.get("/matches/:id", this.getById.bind(this));
    this.router.patch("/matches/:id/result", authenticate, authorize(UserRole.ADMIN), this.updateResult.bind(this));
    this.router.patch("/matches/:id/schedule", authenticate, authorize(UserRole.ADMIN), this.updateSchedule.bind(this));
    this.router.post("/matches/:id/players", authenticate, this.addPlayer.bind(this));
    this.router.put("/matches/:id/players/:userId", authenticate, this.updatePerformance.bind(this));
    this.router.delete("/matches/:id/players/:userId", authenticate, this.removePlayer.bind(this));
  }

  private async getMyWins(req: Request, res: Response): Promise<void> {
    try {
      const wins = await this.matchService.countWinsForUser(req.user!.id);
      res.json({ success: true, data: { wins } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getScheduled(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5));
      const matches = await this.matchService.getScheduled(limit);
      res.json({ success: true, data: matches });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getByTournament(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = parseInt(req.params.tournamentId as string, 10);
      if (isNaN(tournamentId)) { res.status(400).json({ success: false, message: "Invalid tournamentId" }); return; }
      const matches = await this.matchService.getByTournament(tournamentId);
      res.json({ success: true, data: matches });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const result = await this.matchService.getById(id);
      if (result.game.gameId === 0) { res.status(404).json({ success: false, message: "Match not found" }); return; }
      res.json({ success: true, data: result });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async addPlayer(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const { playerId, teamId } = req.body;
      const captainId = req.user!.id;

      if (!playerId || !teamId) { res.status(400).json({ success: false, message: "playerId and teamId are required" }); return; }

      const result = await this.matchService.addPlayer(gameId, Number(playerId), Number(teamId), captainId);
      result.ok
        ? res.status(201).json({ success: true, message: "Player added to match" })
        : res.status(400).json({ success: false, message: result.error });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async updatePerformance(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = parseInt(req.params.userId as string, 10);
      const { performance } = req.body;
      const captainId = req.user!.id;

      if (!performance) { res.status(400).json({ success: false, message: "performance is required" }); return; }

      const ok = await this.matchService.updatePerformance(gameId, playerId, captainId, performance);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Updated" : "Not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async removePlayer(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = parseInt(req.params.userId as string, 10);
      const captainId = req.user!.id;

      const ok = await this.matchService.removePlayer(gameId, playerId, captainId);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Player removed" : "Not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async updateResult(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }

      const { score, winnerTeamId, status } = req.body;
      const validStatuses: string[] = [GameStatus.SCHEDULED, GameStatus.IN_PROGRESS, GameStatus.COMPLETED];
      if (!score || !status || !validStatuses.includes(status as string)) {
        res.status(400).json({ success: false, message: "score and status are required" }); return;
      }

      const ok = await this.matchService.updateResult(id, score as string, winnerTeamId != null ? Number(winnerTeamId) : null, status as GameStatus);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Result updated" : "Match not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }

      const { scheduledTime } = req.body;
      const dt = scheduledTime ? new Date(scheduledTime as string) : null;
      if (scheduledTime && isNaN(dt!.getTime())) {
        res.status(400).json({ success: false, message: "Invalid date format" }); return;
      }

      const ok = await this.matchService.updateScheduledTime(id, dt);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Match time updated" : "Match not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router { return this.router; }
}