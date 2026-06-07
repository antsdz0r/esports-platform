export interface NodeStatus {
  name: string;
  host: string;
  port: number;
  status: string;
  lastCheck: Date | null;
  latencyMs?: number | null;
  replicaOk?: boolean;
}

export interface ApiNodeStatus {
  name: string;
  url: string;
  status: "healthy" | "degraded" | "unreachable";
  latencyMs: number | null;
  lastCheck: string;
  activeConnections?: number;
}

export interface IHealthService {
  getDbNodes(): NodeStatus[];
  getApiNodes(): Promise<ApiNodeStatus[]>;
}
