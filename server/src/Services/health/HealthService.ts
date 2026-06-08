import { IHealthService, NodeStatus, ApiNodeStatus } from "../../Domain/services/health/IHealthService";
import { DbManager } from "../../Database/connection/DbConnectionPool";

// Default portovi odgovaraju instancama iza load balancera (load-balancer/.env).
const DEFAULT_API_PORTS = ["4000", "4001", "4002"];

function buildApiInstances(): { name: string; url: string }[] {
  const instances: { name: string; url: string }[] = [];

  // Otkrij sve API_n_HOST / API_n_PORT instance definisane u env-u
  // (ista konvencija koju koristi load balancer).
  for (let i = 1; ; i++) {
    const host = process.env[`API_${i}_HOST`];
    const port = process.env[`API_${i}_PORT`] ?? DEFAULT_API_PORTS[i - 1];
    if (!host && !port) break;
    instances.push({ name: `api-${i}`, url: `http://${host ?? "localhost"}:${port}` });
    if (i >= 50) break; // safety
  }

  // Fallback: ako env ne definiše nijednu instancu, koristi default portove.
  if (instances.length === 0) {
    DEFAULT_API_PORTS.forEach((port, idx) => {
      instances.push({ name: `api-${idx + 1}`, url: `http://localhost:${port}` });
    });
  }

  return instances;
}

const API_INSTANCES = buildApiInstances();

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
    const lastCheck = new Date().toISOString();
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) return { name, url, status: "unreachable", latencyMs, lastCheck, activeConnections: 0 };
      return {
        name,
        url,
        status: latencyMs > 500 ? "degraded" : "healthy",
        latencyMs,
        lastCheck,
        activeConnections: 0,
      };
    } catch {
      return { name, url, status: "unreachable", latencyMs: null, lastCheck, activeConnections: 0 };
    }
  }
}