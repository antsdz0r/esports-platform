import { Request, Response, Router } from "express";
import { ITeamService } from "../../Domain/services/teams/ITeamService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { validateTeam } from "../validators/teams/validateTeams";

export class TeamController {
  private readonly router = Router();

  public constructor(private readonly teamService: ITeamService) {
    this.router.get("/teams", authenticate, this.getMyTeams.bind(this));
    this.router.post("/teams", authenticate, this.create.bind(this));
    this.router.get("/teams/:id", this.getById.bind(this));
    this.router.put("/teams/:id", authenticate, this.update.bind(this));
    this.router.delete("/teams/:id", authenticate, this.delete.bind(this));
    this.router.patch("/teams/:id/members/:userId/role", authenticate, this.transferCaptain.bind(this));
    this.router.delete("/teams/:id/members/:userId", authenticate, this.removeMember.bind(this));
  }

  private async getMyTeams(req: Request, res: Response): Promise<void> {
    try{
      const teams = await this.teamService.getMyTeams(req.user!.id);
      res.status(200).json({ success: true, data: teams });
  } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
  }
}

  private async create(req: Request, res: Response): Promise<void> {
    try{
    const { teamName, tag, logo, description } = req.body;

    const validation = validateTeam(teamName, tag, logo);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.message });
      return;
    }
  
    const created = await this.teamService.create({
      userId: req.user!.id,
      teamName,
      tag,
      logo,
      description,
    });

    if (!created) {
      res.status(400).json({ success: false, message: "Team create failed" });
      return;
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
  private async getById(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const team = await this.teamService.getById(id);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }
    res.status(200).json({ success: true, data: team });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const { teamName, tag, logo, description } = req.body;
    const validation = validateTeam(teamName, tag, logo);
    if (!validation.valid) {
      res.status(400).json({ success: false, message: validation.message });
      return;
  }

    const ok = await this.teamService.update(req.user!.id, id, { teamName, tag, logo, description });
    res.status(ok ? 200 : 403).json({ success: ok, message: ok ? "Team updated" : "Update denied" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

  private async delete(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const ok = await this.teamService.delete(req.user!.id, id);
    res.status(ok ? 200 : 403).json({ success: ok, message: ok ? "Team deleted" : "Delete denied" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

  private async transferCaptain(req: Request, res: Response): Promise<void> {
    try{
    const teamId = parseInt(req.params.id as string, 10);
    const targetUserId = parseInt(req.params.userId as string, 10);
    if (isNaN(teamId) || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: "Invalid params" });
      return;
    }

    const ok = await this.teamService.transferCaptain(req.user!.id, teamId, targetUserId);
    res.status(ok ? 200 : 403).json({
      success: ok,
      message: ok ? "Captain transferred" : "Transfer denied",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

  private async removeMember(req: Request, res: Response): Promise<void> {
    try{
    const teamId = parseInt(req.params.id as string, 10);
    const targetUserId = parseInt(req.params.userId as string, 10);
    if (isNaN(teamId) || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: "Invalid params" });
      return;
    }

    const ok = await this.teamService.removeMember(req.user!.id, teamId, targetUserId);
    res.status(ok ? 200 : 403).json({
      success: ok,
      message: ok ? "Member removed" : "Action denied",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
  public getRouter(): Router {
    return this.router;
  }
}
