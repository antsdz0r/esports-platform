import { Request, Response, Router } from "express";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { UserRole } from "../../Domain/enums/UserRole";

export class AuditLogController {
  private readonly router = Router();

  public constructor(private readonly auditLogService: IAuditLogService) {
    this.router.get("/audits/logs", authenticate, authorize(UserRole.ADMIN), this.getAll.bind(this));
  }

  private async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page  = parseInt(req.query.page  as string ?? "1",  10) || 1;
      const limit = parseInt(req.query.limit as string ?? "20", 10) || 20;

      if (isNaN(page) || page < 1)   { res.status(400).json({ success: false, message: "Neispravan page" }); return; }
      if (isNaN(limit) || limit < 1) { res.status(400).json({ success: false, message: "Neispravan limit" }); return; }

      const result = await this.auditLogService.getAll(page, limit);
      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router { return this.router; }
}
