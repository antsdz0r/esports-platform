import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IGameCatalogService } from "../../Domain/services/games/IGameCatalogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";

export class GameCatalogController {
  private readonly router = Router();

  public constructor(private readonly gameService: IGameCatalogService) {
    this.router.get("/games", this.getAll.bind(this));
    this.router.get("/games/:id", this.getById.bind(this));
    this.router.post("/games", authenticate, authorize(UserRole.ADMIN), this.create.bind(this));
    this.router.put("/games/:id", authenticate, authorize(UserRole.ADMIN), this.update.bind(this));
    this.router.delete("/games/:id", authenticate, authorize(UserRole.ADMIN), this.delete.bind(this));
  }

  private async getAll(req: Request, res: Response): Promise<void> {
    try{
    const games = await this.gameService.getAll();
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }}

  private async getById(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const game = await this.gameService.getById(id);
    if (!game) {
      res.status(404).json({ success: false, message: "Game not found" });
      return;
    }

    res.status(200).json({ success: true, data: game });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }}

  private async create(req: Request, res: Response): Promise<void> {
    try{
    const { name, tag, genre, maxPlayers } = req.body;
    if (!name || !tag || !genre || typeof maxPlayers !== "number" || maxPlayers <= 0) {
      res.status(400).json({ success: false, message: "Invalid payload" });
      return;
    }

    const created = await this.gameService.create({ name, tag, genre, maxPlayers });
    if (!created) {
      res.status(400).json({ success: false, message: "Game with same name or tag already exists" });
      return;
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }}

  private async update(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const { name, tag, genre, maxPlayers } = req.body;
    if (!name || !tag || !genre || typeof maxPlayers !== "number" || maxPlayers <= 0) {
      res.status(400).json({ success: false, message: "Invalid payload" });
      return;
    }

    const ok = await this.gameService.update(id, { name, tag, genre, maxPlayers });
    res.status(ok ? 200 : 400).json({
      success: ok,
      message: ok ? "Game updated" : "Update failed",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }}

  private async delete(req: Request, res: Response): Promise<void> {
    try{
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }

    const ok = await this.gameService.delete(id);
    res.status(ok ? 200 : 400).json({
      success: ok,
      message: ok ? "Game deleted" : "Cannot delete game with tournaments",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }}

  public getRouter(): Router {
    return this.router;
  }
}
