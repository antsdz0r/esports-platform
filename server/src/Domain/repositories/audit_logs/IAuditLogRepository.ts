import { AuditLog } from "../../models/AuditLog";

export interface IAuditLogRepository {
  create(
    userId: number | null,
    action: string,
    entity: string | null,
    entityId: number | null,
    description: string | null,
    ipAddress: string | null,
  ): Promise<boolean>;
  findAll(page: number, limit: number): Promise<{ logs: AuditLog[]; total: number }>;
}