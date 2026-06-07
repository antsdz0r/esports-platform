import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IMatchPlayerRepository } from "../../../Domain/repositories/match_players/IMatchPlayerRepository";
import { MatchPlayer } from "../../../Domain/models/MatchPlayer";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class MatchPlayerRepository implements IMatchPlayerRepository {
  constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): MatchPlayer {
    return new MatchPlayer(r.game_id, r.player_id, r.team_id, r.performance_notes ?? null);
  }

  async getByGame(gameId: number): Promise<MatchPlayer[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM MATCH_PLAYERS WHERE game_id = ?",
        [gameId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("MatchPlayerRepository", "getByGame failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async addPlayer(entry: MatchPlayer): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "INSERT IGNORE INTO MATCH_PLAYERS (game_id, player_id, team_id, performance_notes) VALUES (?, ?, ?, ?)",
        [entry.gameId, entry.playerId, entry.teamId, entry.performance]
      );
      return result.affectedRows >= 0;
    } catch (err) {
      this.logger.error("MatchPlayerRepository", "addPlayer failed: " + (err as Error).message);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updatePerformance(gameId: number, playerId: number, performance: string): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "UPDATE MATCH_PLAYERS SET performance_notes = ? WHERE game_id = ? AND player_id = ?",
        [performance, gameId, playerId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("MatchPlayerRepository", "updatePerformance failed: " + (err as Error).message);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async removePlayer(gameId: number, playerId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "DELETE FROM MATCH_PLAYERS WHERE game_id = ? AND player_id = ?",
        [gameId, playerId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("MatchPlayerRepository", "removePlayer failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async exists(gameId: number, playerId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as cnt FROM MATCH_PLAYERS WHERE game_id = ? AND player_id = ?",
        [gameId, playerId]
      );
      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("MatchPlayerRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
