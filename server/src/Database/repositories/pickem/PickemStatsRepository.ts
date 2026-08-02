import { RowDataPacket } from "mysql2";
import { IPickemStatsRepository, LeaderboardRow } from "../../../Domain/repositories/pickem/IPickemStatsRepository";
import { PickemStats } from "../../../Domain/models/PickemStats";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class PickemStatsRepository implements IPickemStatsRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private mapRow(r: RowDataPacket): LeaderboardRow {
    return {
      userId: r.user_id as number,
      gamerTag: r.gamer_tag as string,
      profilePicture: r.profile_picture ?? null,
      totalPoints: r.total_points ?? 0,
      correctPredictions: r.correct_predictions ?? 0,
      totalPredictions: r.total_predictions ?? 0,
      bestStreak: r.best_streak ?? 0,
      currentStreak: r.current_streak ?? 0,
      badgeCount: r.badge_count ?? 0,
    };
  }

  async getForUser(userId: number): Promise<PickemStats> {
    const res = await this.db.getReadConnection();
    if (!res) return new PickemStats(userId);
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_PICKEM_STATS WHERE user_id = ?",
        [userId]
      );
      const r = rows[0];
      if (!r) return new PickemStats(userId);
      return new PickemStats(
        r.user_id, r.total_points ?? 0, r.total_predictions ?? 0,
        r.correct_predictions ?? 0, r.current_streak ?? 0, r.best_streak ?? 0,
      );
    } catch {
      this.logger.error("PickemStatsRepository", "getForUser failed");
      return new PickemStats(userId);
    } finally {
      res.conn.release();
    }
  }

  async upsert(stats: PickemStats): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        `INSERT INTO PRO_PICKEM_STATS
           (user_id, total_points, total_predictions, correct_predictions, current_streak, best_streak)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_points = VALUES(total_points),
           total_predictions = VALUES(total_predictions),
           correct_predictions = VALUES(correct_predictions),
           current_streak = VALUES(current_streak),
           best_streak = VALUES(best_streak),
           updated_at = NOW()`,
        [stats.userId, stats.totalPoints, stats.totalPredictions,
         stats.correctPredictions, stats.currentStreak, stats.bestStreak]
      );
    } catch {
      this.logger.error("PickemStatsRepository", "upsert failed");
    } finally {
      res.conn.release();
    }
  }

  async getRank(userId: number): Promise<number | null> {
    const res = await this.db.getReadConnection();
    if (!res) return null;
    try {
      const [me] = await res.conn.execute<RowDataPacket[]>(
        "SELECT total_points, total_predictions FROM PRO_PICKEM_STATS WHERE user_id = ?",
        [userId]
      );
      const row = me[0];
      if (!row || (row.total_predictions ?? 0) === 0) return null;
      const [cnt] = await res.conn.execute<RowDataPacket[]>(
        "SELECT COUNT(*) + 1 AS rnk FROM PRO_PICKEM_STATS WHERE total_points > ?",
        [row.total_points ?? 0]
      );
      return (cnt[0]?.rnk as number) ?? null;
    } catch {
      this.logger.error("PickemStatsRepository", "getRank failed");
      return null;
    } finally {
      res.conn.release();
    }
  }

  async leaderboard(limit: number): Promise<LeaderboardRow[]> {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT s.user_id, u.gamer_tag, u.profile_picture,
                s.total_points, s.correct_predictions, s.total_predictions,
                s.best_streak, s.current_streak,
                (SELECT COUNT(*) FROM USER_BADGES b WHERE b.user_id = s.user_id) AS badge_count
           FROM PRO_PICKEM_STATS s
           JOIN users u ON u.id = s.user_id
          WHERE s.total_predictions > 0
          ORDER BY s.total_points DESC, s.correct_predictions DESC, s.best_streak DESC, u.gamer_tag ASC
          LIMIT ${safeLimit}`
      );
      return rows.map((r) => this.mapRow(r));
    } catch {
      this.logger.error("PickemStatsRepository", "leaderboard failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async getRowForUser(userId: number): Promise<LeaderboardRow | null> {
    const res = await this.db.getReadConnection();
    if (!res) return null;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT s.user_id, u.gamer_tag, u.profile_picture,
                s.total_points, s.correct_predictions, s.total_predictions,
                s.best_streak, s.current_streak,
                (SELECT COUNT(*) FROM USER_BADGES b WHERE b.user_id = s.user_id) AS badge_count
           FROM PRO_PICKEM_STATS s
           JOIN users u ON u.id = s.user_id
          WHERE s.user_id = ?`,
        [userId]
      );
      return rows[0] ? this.mapRow(rows[0]) : null;
    } catch {
      this.logger.error("PickemStatsRepository", "getRowForUser failed");
      return null;
    } finally {
      res.conn.release();
    }
  }
}
