import { IncomingMessage, ServerResponse, createServer } from "http";
import { request as httpRequest } from "http";
import { ILoggerService } from "./services/ILoggerService";

export type LbStrategy = "round_robin" | "weighted" | "least_connections" | "ip_hash";

export interface ApiInstance {
  name: string;
  host: string;
  port: number;
  weight: number;
  activeConnections: number;
  status: "healthy" | "degraded" | "unreachable";
  lastCheck: Date | null;
}

export class LoadBalancer {
  private readonly instances: ApiInstance[];
  private rrIndex: number = 0;
  private readonly strategy: LbStrategy;
  private healthTimer: NodeJS.Timeout | null = null;
  private readonly DEGRADED_THRESHOLD_MS = 500;
  private readonly HEALTH_INTERVAL_MS: number;

  public constructor(private readonly logger: ILoggerService) {
    this.strategy = (process.env.LB_STRATEGY as LbStrategy) ?? "round_robin";
    this.HEALTH_INTERVAL_MS = parseInt(process.env.LB_HEALTH_INTERVAL_MS ?? "10000", 10);
    this.instances = this.parseInstances();
  }

  private parseInstances(): ApiInstance[] {
    const raw = [
      { name: "api-1", host: process.env.API_1_HOST ?? "localhost", port: parseInt(process.env.API_1_PORT ?? "3001", 10), weight: parseInt(process.env.API_1_WEIGHT ?? "1", 10) },
      { name: "api-2", host: process.env.API_2_HOST ?? "localhost", port: parseInt(process.env.API_2_PORT ?? "3002", 10), weight: parseInt(process.env.API_2_WEIGHT ?? "1", 10) },
      { name: "api-3", host: process.env.API_3_HOST ?? "localhost", port: parseInt(process.env.API_3_PORT ?? "3003", 10), weight: parseInt(process.env.API_3_WEIGHT ?? "1", 10) },
    ];
    return raw.map((i) => ({ ...i, activeConnections: 0, status: "healthy" as const, lastCheck: null }));
  }

  public async init(): Promise<void> {
    await this.runHealthCheck();
    this.healthTimer = setInterval(() => void this.runHealthCheck(), this.HEALTH_INTERVAL_MS);
    this.logger.info("LoadBalancer", `Started with strategy: ${this.strategy}`);
  }

  private async probeInstance(instance: ApiInstance): Promise<void> {
    const start = Date.now();
    await new Promise<void>((resolve) => {
      const req = httpRequest(
        { host: instance.host, port: instance.port, path: "/api/health", method: "GET", timeout: 3000 },
        (res) => {
          const latency = Date.now() - start;
          instance.status = res.statusCode === 200
            ? latency > this.DEGRADED_THRESHOLD_MS ? "degraded" : "healthy"
            : "unreachable";
          instance.lastCheck = new Date();
          res.resume();
          resolve();
        }
      );
      req.on("error", () => { instance.status = "unreachable"; instance.lastCheck = new Date(); resolve(); });
      req.on("timeout", () => { req.destroy(); instance.status = "unreachable"; instance.lastCheck = new Date(); resolve(); });
      req.end();
    });
  }

  public async runHealthCheck(): Promise<void> {
    await Promise.all(this.instances.map((i) => this.probeInstance(i)));
    this.logger.info("LoadBalancer", this.instances.map((i) => `${i.name}=${i.status}`).join(" | "));
  }

  private getHealthyInstances(): ApiInstance[] {
    const healthy = this.instances.filter((i) => i.status === "healthy");
    if (healthy.length > 0) return healthy;
    return this.instances.filter((i) => i.status === "degraded");
  }

  private pickRoundRobin(): ApiInstance | null {
    const pool = this.getHealthyInstances();
    if (pool.length === 0) return null;
    const instance = pool[this.rrIndex % pool.length];
    this.rrIndex = (this.rrIndex + 1) % pool.length;
    return instance;
  }

  private pickWeighted(): ApiInstance | null {
    const pool = this.getHealthyInstances();
    if (pool.length === 0) return null;
    const totalWeight = pool.reduce((sum, i) => sum + i.weight, 0);
    let random = Math.random() * totalWeight;
    for (const instance of pool) {
      random -= instance.weight;
      if (random <= 0) return instance;
    }
    return pool[pool.length - 1];
  }

  private pickLeastConnections(): ApiInstance | null {
    const pool = this.getHealthyInstances();
    if (pool.length === 0) return null;
    return pool.reduce((min, i) => i.activeConnections < min.activeConnections ? i : min);
  }

  private pickIpHash(clientIp: string): ApiInstance | null {
    const pool = this.getHealthyInstances();
    if (pool.length === 0) return null;
    const hash = clientIp.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return pool[hash % pool.length];
  }

  public pick(clientIp: string): ApiInstance | null {
    switch (this.strategy) {
      case "weighted":          return this.pickWeighted();
      case "least_connections": return this.pickLeastConnections();
      case "ip_hash":           return this.pickIpHash(clientIp);
      default:                  return this.pickRoundRobin();
    }
  }

  public proxy(req: IncomingMessage, res: ServerResponse): void {
    const clientIp = req.socket.remoteAddress ?? "0.0.0.0";
    const target = this.pick(clientIp);

    if (!target) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "No healthy API instances available" }));
      return;
    }

    target.activeConnections++;

    const options = {
      host: target.host,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, "x-forwarded-for": clientIp, "x-lb-target": target.name },
    };

    const proxy = httpRequest(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on("end", () => { target.activeConnections--; });
    });

    proxy.on("error", () => {
      target.activeConnections--;
      target.status = "unreachable";
      this.logger.warn("LoadBalancer", `Instance ${target.name} failed mid-request`);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: "Bad gateway" }));
      }
    });

    req.pipe(proxy);
  }

  public getInstances(): ApiInstance[] { return this.instances; }

  public stop(): void {
    if (this.healthTimer) clearInterval(this.healthTimer);
  }
}
