import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IWatchlistRepository } from "../../../Domain/repositories/watchlist/IWatchListRepository";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class WatchlistRepository implements IWatchlistRepository {
  constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  async add(userId: number, tournamentId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `INSERT INTO USER_WATCHLIST (user_id, tournament_id, added_at) VALUES (?, ?, NOW())`,
        [userId, tournamentId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("WatchlistRepository", "add failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async remove(userId: number, tournamentId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `DELETE FROM USER_WATCHLIST WHERE user_id = ? AND tournament_id = ?`,
        [userId, tournamentId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("WatchlistRepository", "remove failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async exists(userId: number, tournamentId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM USER_WATCHLIST WHERE user_id = ? AND tournament_id = ?`,
        [userId, tournamentId]
      );
      return (rows[0]?.cnt ?? 0) > 0;
    } catch (err) {
      this.logger.error("WatchlistRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async getByUser(userId: number): Promise<number[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT tournament_id FROM USER_WATCHLIST WHERE user_id = ? ORDER BY added_at DESC`,
        [userId]
      );
      return rows.map((r) => r.tournament_id);
    } catch (err) {
      this.logger.error("WatchlistRepository", "getByUser failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }
}