import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IUserBadgeRepository } from "../../../Domain/repositories/pickem/IUserBadgeRepository";
import { UserBadge } from "../../../Domain/models/UserBadge";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class UserBadgeRepository implements IUserBadgeRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  async listForUser(userId: number): Promise<UserBadge[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT id, user_id, badge_code, earned_at FROM USER_BADGES WHERE user_id = ? ORDER BY earned_at ASC",
        [userId]
      );
      return rows.map((r) => new UserBadge(
        r.id, r.user_id, r.badge_code as string,
        r.earned_at ? new Date(r.earned_at) : null,
      ));
    } catch {
      this.logger.error("UserBadgeRepository", "listForUser failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async listCodesForUser(userId: number): Promise<string[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT badge_code FROM USER_BADGES WHERE user_id = ?",
        [userId]
      );
      return rows.map((r) => r.badge_code as string);
    } catch {
      this.logger.error("UserBadgeRepository", "listCodesForUser failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async award(userId: number, code: string): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "INSERT IGNORE INTO USER_BADGES (user_id, badge_code) VALUES (?, ?)",
        [userId, code]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("UserBadgeRepository", "award failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
