import { Request, Response, Router } from "express";
import { db } from "../../app";
import { UserRole } from "../../Domain/enums/UserRole";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";

interface ApiNodeInfo {
  name: string;
  url: string;
  status: "healthy" | "degraded" | "unreachable";
  latencyMs: number | null;
}

const API_INSTANCES = [
  { name: "api-1", url: process.env.API_INSTANCE_1_URL ?? `http://localhost:${process.env.PORT ?? 4000}` },
  { name: "api-2", url: process.env.API_INSTANCE_2_URL ?? null },
  { name: "api-3", url: process.env.API_INSTANCE_3_URL ?? null },
].filter((i) => i.url !== null) as { name: string; url: string }[];

async function probeInstance(name: string, url: string): Promise<ApiNodeInfo> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
    const latencyMs = Date.now() - start;
    if (!res.ok) return { name, url, status: "unreachable", latencyMs };
    return { name, url, status: latencyMs > 500 ? "degraded" : "healthy", latencyMs };
  } catch {
    return { name, url, status: "unreachable", latencyMs: null };
  }
}

export class HealthCheckController {
  private readonly router = Router();

  public constructor() {
    this.router.get("/health", this.publicCheck.bind(this));
    this.router.get("/health/db", authenticate, authorize(UserRole.ADMIN), this.checkDb.bind(this));
    this.router.get("/health/api", authenticate, authorize(UserRole.ADMIN), this.checkApi.bind(this));
  }

  private publicCheck(_req: Request, res: Response): void {
    res.json({ success: true, message: "OK" });
  }

  private async checkDb(_req: Request, res: Response): Promise<void> {
    try {
      const nodes = db.getNodes();
      res.json({ success: true, data: nodes });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async checkApi(_req: Request, res: Response): Promise<void> {
    try {
      const results = await Promise.all(
        API_INSTANCES.map((i) => probeInstance(i.name, i.url))
      );
      res.json({ success: true, data: results });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}