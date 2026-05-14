import { Request, Response, Router } from "express";
import { db } from "../../app";
import { UserRole } from "../../Domain/enums/UserRole";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";

export class HealthCheckController {
    private readonly router = Router();

    public constructor() {
        this.router.get("/health/db", authenticate, authorize(UserRole.ADMIN), this.checkDb.bind(this));
    }

    private async checkDb(req: Request, res: Response): Promise<void> {
        try {
            const nodes = db.getNodes();
            res.json({ success: true, data: nodes });
        } catch (err) {
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    
    }
      public getRouter(): Router {
        return this.router;
  }
}