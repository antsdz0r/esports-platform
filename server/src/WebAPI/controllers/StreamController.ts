import { Request, Response, Router } from "express";
import { UserRole } from "../../Domain/enums/UserRole";
import { IMatchStreamService } from "../../Domain/services/streams/IMatchStreamService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { validateStream } from "../validators/streams/validateStream";
import { CreateStreamData } from "../../Domain/models/CreateStreamData";
import { UpdateStreamData } from "../../Domain/models/UpdateStreamData";
import { StreamPlatform } from "../../Domain/enums/StreamPlatform";
import { StreamType } from "../../Domain/enums/StreamType";

export class StreamController {
  private readonly router = Router();

  public constructor(
    private readonly streamService: IMatchStreamService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router.get("/matches/:id/streams", this.getForMatch.bind(this));
    this.router.get("/matches/:id/streams/all", authenticate, authorize(UserRole.ADMIN), this.getAllForMatch.bind(this));
    this.router.post("/matches/:id/streams", authenticate, authorize(UserRole.ADMIN), this.create.bind(this));
    this.router.put("/streams/:streamId", authenticate, authorize(UserRole.ADMIN), this.update.bind(this));
    this.router.delete("/streams/:streamId", authenticate, authorize(UserRole.ADMIN), this.delete.bind(this));
  }

  private async getForMatch(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      if (isNaN(gameId)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const streams = await this.streamService.getForMatch(gameId);
      res.status(200).json({ success: true, data: streams });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getAllForMatch(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      if (isNaN(gameId)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const streams = await this.streamService.getAllForMatch(gameId);
      res.status(200).json({ success: true, data: streams });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      if (isNaN(gameId)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }

      const { platform, channel, type, language, title } = req.body;
      const validation = validateStream(platform, channel, type, language, title ?? null);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }

      const created = await this.streamService.create(
        new CreateStreamData(
          gameId, platform as StreamPlatform, (channel as string).trim(),
          type as StreamType, (language as string).trim(), title ? (title as string).trim() : null
        )
      );
      if (!created.ok) { res.status(400).json({ success: false, message: created.error ?? "Stream create failed" }); return; }

      await this.auditLogService.log(req.user?.id ?? null, "CREATE_STREAM", "stream", created.stream?.streamId ?? null, `Dodat stream za meč #${gameId}`, req.socket.remoteAddress ?? null);
      res.status(201).json({ success: true, data: created.stream });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const streamId = parseInt(req.params.streamId as string, 10);
      if (isNaN(streamId)) { res.status(400).json({ success: false, message: "Invalid streamId" }); return; }

      const { platform, channel, type, language, title, isActive } = req.body;
      const validation = validateStream(platform, channel, type, language, title ?? null);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }

      const ok = await this.streamService.update(
        streamId,
        new UpdateStreamData(
          platform as StreamPlatform, (channel as string).trim(), type as StreamType,
          (language as string).trim(), title ? (title as string).trim() : null, isActive !== false
        )
      );
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "UPDATE_STREAM", "stream", streamId, `Izmenjen stream #${streamId}`, req.socket.remoteAddress ?? null);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Stream updated" : "Stream not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const streamId = parseInt(req.params.streamId as string, 10);
      if (isNaN(streamId)) { res.status(400).json({ success: false, message: "Invalid streamId" }); return; }
      const ok = await this.streamService.delete(streamId);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "DELETE_STREAM", "stream", streamId, `Obrisan stream #${streamId}`, req.socket.remoteAddress ?? null);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Stream deleted" : "Stream not found" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
