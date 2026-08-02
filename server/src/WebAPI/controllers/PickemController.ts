import { Request, Response, Router } from "express";
import { IPickemService } from "../../Domain/services/pickem/IPickemService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { validatePrediction } from "../validators/pickem/validatePrediction";

export class PickemController {
  private readonly router = Router();

  public constructor(
    private readonly pickemService: IPickemService,
  ) {
    this.router.get("/pickem/matches", authenticate, this.getMatches.bind(this));
    this.router.get("/pickem/predictions", authenticate, this.getMyPredictions.bind(this));
    this.router.get("/pickem/leaderboard", authenticate, this.getLeaderboard.bind(this));
    this.router.get("/pickem/summary", authenticate, this.getSummary.bind(this));
    this.router.post("/pickem/matches/:matchId/predict", authenticate, this.predict.bind(this));
    this.router.delete("/pickem/matches/:matchId/predict", authenticate, this.removePrediction.bind(this));
  }

  private async getMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 60));
      res.status(200).json({ success: true, data: await this.pickemService.getMatches(userId, limit) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getMyPredictions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 100));
      res.status(200).json({ success: true, data: await this.pickemService.getMyPredictions(userId, limit) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      res.status(200).json({ success: true, data: await this.pickemService.getLeaderboard(userId, limit) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      res.status(200).json({ success: true, data: await this.pickemService.getSummary(userId) });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async predict(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const matchId = parseInt(req.params.matchId as string, 10);
      if (isNaN(matchId)) { res.status(400).json({ success: false, message: "Invalid match id" }); return; }

      const side = Number(req.body?.side);
      const validation = validatePrediction(side);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }

      const result = await this.pickemService.predict(userId, matchId, side);
      if (!result.ok) { res.status(400).json({ success: false, message: result.message ?? "Prediction failed" }); return; }
      res.status(201).json({ success: true, message: "Pick saved" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async removePrediction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const matchId = parseInt(req.params.matchId as string, 10);
      if (isNaN(matchId)) { res.status(400).json({ success: false, message: "Invalid match id" }); return; }

      const result = await this.pickemService.removePrediction(userId, matchId);
      if (!result.ok) { res.status(400).json({ success: false, message: result.message ?? "Removal failed" }); return; }
      res.status(200).json({ success: true, message: "Pick removed" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
