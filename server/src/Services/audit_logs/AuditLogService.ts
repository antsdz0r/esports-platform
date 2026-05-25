import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { IAuditLogRepository } from "../../Domain/repositories/audit_logs/IAuditLogRepository";
import { AuditLog } from "../../Domain/models/AuditLog";

export class AuditLogService implements IAuditLogService {
  public constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  public async log(
    userId: number | null,
    action: string,
    entity: string | null,
    entityId: number | null,
    description: string | null,
    ipAddress: string | null,
  ): Promise<void> {
    await this.auditLogRepo.create(userId, action, entity, entityId, description, ipAddress);
  }

  public async getAll(page: number, limit: number): Promise<{ logs: AuditLog[]; total: number }> {
    return this.auditLogRepo.findAll(page, limit);
  }
}