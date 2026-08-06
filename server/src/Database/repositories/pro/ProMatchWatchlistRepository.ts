import { RowDataPacket } from "mysql2";
import { IProMatchWatchlistRepository } from "../../../Domain/repositories/pro/IProMatchWatchlistRepository";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProMatchWatchlistRepository implements IProMatchWatchlistRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  async add(userId: number, proMatchId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      await res.conn.execute(
        "INSERT IGNORE INTO PRO_MATCH_WATCHLIST (user_id, pro_match_id) VALUES (?, ?)",
        [userId, proMatchId]
      );
      return true;
    } catch (e) {
      this.logger.error("ProMatchWatchlistRepository", `add failed: ${String(e)}`);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async remove(userId: number, proMatchId: number): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "DELETE FROM PRO_MATCH_WATCHLIST WHERE user_id = ? AND pro_match_id = ?",
        [userId, proMatchId]
      );
    } catch {
      this.logger.error("ProMatchWatchlistRepository", "remove failed");
    } finally {
      res.conn.release();
    }
  }

  async listIds(userId: number): Promise<number[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT pro_match_id FROM PRO_MATCH_WATCHLIST WHERE user_id = ?",
        [userId]
      );
      return rows.map((r) => r.pro_match_id as number);
    } catch {
      this.logger.error("ProMatchWatchlistRepository", "listIds failed");
      return [];
    } finally {
      res.conn.release();
    }
  }
}
