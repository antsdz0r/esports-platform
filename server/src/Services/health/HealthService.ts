import { IHealthService, NodeStatus, ApiNodeStatus } from "../../Domain/services/health/IHealthService";
import { DbManager } from "../../Database/connection/DbConnectionPool";

const API_INSTANCES = [
  { name: "api-1", url: process.env.API_INSTANCE_1_URL ?? `http://localhost:${process.env.PORT ?? 4000}` },
  { name: "api-2", url: process.env.API_INSTANCE_2_URL ?? null },
  { name: "api-3", url: process.env.API_INSTANCE_3_URL ?? null },
].filter((i) => i.url !== null) as { name: string; url: string }[];

export class HealthService implements IHealthService {
  public constructor(private readonly db: DbManager) {}

  public getDbNodes(): NodeStatus[] {
    return this.db.getNodes();
  }

  public async getApiNodes(): Promise<ApiNodeStatus[]> {
    return Promise.all(API_INSTANCES.map((i) => this.probeInstance(i.name, i.url)));
  }

  private async probeInstance(name: string, url: string): Promise<ApiNodeStatus> {
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
}