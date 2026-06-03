export interface NodeStatus {
  name: string;
  host: string;
  port: number;
  status: string;
  lastCheck: Date | null;
}

export interface ApiNodeStatus {
  name: string;
  url: string;
  status: "healthy" | "degraded" | "unreachable";
  latencyMs: number | null;
}

export interface IHealthService {
  getDbNodes(): NodeStatus[];
  getApiNodes(): Promise<ApiNodeStatus[]>;
}