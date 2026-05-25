import { AuditLog } from "../../models/AuditLog";

export interface IAuditLogService {
  log(
    userId: number | null,
    action: string,
    entity: string | null,
    entityId: number | null,
    description: string | null,
    ipAddress: string | null,
  ): Promise<void>;
  getAll(page: number, limit: number): Promise<{ logs: AuditLog[]; total: number }>;
}