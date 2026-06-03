import { Request, Response, Router } from "express";
import { IHealthService } from "../../Domain/services/health/IHealthService";
import { UserRole } from "../../Domain/enums/UserRole";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";



export class HealthCheckController {
  private readonly router = Router();

  public constructor(private readonly healthService: IHealthService) {
    this.router.get("/health", this.publicCheck.bind(this));
    this.router.get("/health/db", authenticate, authorize(UserRole.ADMIN), this.checkDb.bind(this));
    this.router.get("/health/api", authenticate, authorize(UserRole.ADMIN), this.checkApi.bind(this));
  }

  private publicCheck(_req: Request, res: Response): void {
    res.json({ success: true, message: "OK" });
  }

  private async checkDb(_req: Request, res: Response): Promise<void> {
    try {
      const nodes = this.healthService.getDbNodes();
      res.json({ success: true, data: nodes });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async checkApi(_req: Request, res: Response): Promise<void> {
    try {
      const results = await this.healthService.getApiNodes();
      res.json({ success: true, data: results });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}