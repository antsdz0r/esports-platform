import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IAuditLogRepository } from "../../../Domain/repositories/audit_logs/IAuditLogRepository";
import { AuditLog } from "../../../Domain/models/AuditLog";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class AuditLogRepository implements IAuditLogRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): AuditLog {
    return new AuditLog(
      r.id, r.user_id ?? null, r.action,
      r.entity ?? null, r.entity_id ?? null,
      r.description ?? null, r.ip_address ?? null,
      new Date(r.created_at)
    );
  }

  public async create(
    userId: number | null, action: string, entity: string | null,
    entityId: number | null, description: string | null, ipAddress: string | null,
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `INSERT INTO AUDIT_LOGS (user_id, action, entity, entity_id, description, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, action, entity, entityId, description, ipAddress]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("AuditLogRepository", "create failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  public async findAll(page: number, limit: number): Promise<{ logs: AuditLog[]; total: number }> {
    const res = await this.db.getWriteConnection();
    console.log("findAll connection:", res ? res.nodeName : "NULL");
    if (!res) return { logs: [], total: 0 };
    try {
      const offset = (page - 1) * limit;
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM AUDIT_LOGS ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      const [countRows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM AUDIT_LOGS`
      );
      return {
        logs: rows.map((r) => this.map(r)),
        total: Number(countRows[0]?.total ?? 0),
      };
    } catch {
      this.logger.error("AuditLogRepository", "findAll failed");
      return { logs: [], total: 0 };
    } finally {
      res.conn.release();
    }
  }
}