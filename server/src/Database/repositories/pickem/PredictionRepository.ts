import { RowDataPacket, ResultSetHeader } from "mysql2";
import {
  IPredictionRepository,
  VoteCountRow,
  SettleRow,
  PredictionMatchRow,
} from "../../../Domain/repositories/pickem/IPredictionRepository";
import { Prediction } from "../../../Domain/models/Prediction";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class PredictionRepository implements IPredictionRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): Prediction {
    return new Prediction(
      r.id,
      r.user_id,
      r.pro_match_id,
      r.predicted_side,
      r.is_correct === null ? null : r.is_correct === 1 || r.is_correct === true,
      r.points_awarded ?? 0,
      r.settled_at ? new Date(r.settled_at) : null,
      r.created_at ? new Date(r.created_at) : null,
    );
  }

  async upsert(userId: number, proMatchId: number, side: number): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        `INSERT INTO PRO_PREDICTIONS (user_id, pro_match_id, predicted_side)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE predicted_side = VALUES(predicted_side), updated_at = NOW()`,
        [userId, proMatchId, side]
      );
    } catch {
      this.logger.error("PredictionRepository", "upsert failed");
    } finally {
      res.conn.release();
    }
  }

  async remove(userId: number, proMatchId: number): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "DELETE FROM PRO_PREDICTIONS WHERE user_id = ? AND pro_match_id = ? AND is_correct IS NULL",
        [userId, proMatchId]
      );
    } catch {
      this.logger.error("PredictionRepository", "remove failed");
    } finally {
      res.conn.release();
    }
  }

  async findByUserAndMatches(userId: number, matchIds: number[]): Promise<Prediction[]> {
    if (matchIds.length === 0) return [];
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        "SELECT * FROM PRO_PREDICTIONS WHERE user_id = ? AND pro_match_id IN (?)",
        [userId, matchIds]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("PredictionRepository", "findByUserAndMatches failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async countVotesByMatch(matchIds: number[]): Promise<VoteCountRow[]> {
    if (matchIds.length === 0) return [];
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT pro_match_id, predicted_side, COUNT(*) AS c
           FROM PRO_PREDICTIONS
          WHERE pro_match_id IN (?)
          GROUP BY pro_match_id, predicted_side`,
        [matchIds]
      );
      const byMatch = new Map<number, VoteCountRow>();
      for (const r of rows) {
        const id = r.pro_match_id as number;
        const row = byMatch.get(id) ?? { proMatchId: id, side1: 0, side2: 0 };
        if (r.predicted_side === 1) row.side1 = r.c as number;
        else if (r.predicted_side === 2) row.side2 = r.c as number;
        byMatch.set(id, row);
      }
      return [...byMatch.values()];
    } catch {
      this.logger.error("PredictionRepository", "countVotesByMatch failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async countForUser(userId: number): Promise<number> {
    const res = await this.db.getReadConnection();
    if (!res) return 0;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM PRO_PREDICTIONS WHERE user_id = ?",
        [userId]
      );
      return (rows[0]?.c as number) ?? 0;
    } catch {
      this.logger.error("PredictionRepository", "countForUser failed");
      return 0;
    } finally {
      res.conn.release();
    }
  }

  async findHistoryForUser(userId: number, limit: number): Promise<PredictionMatchRow[]> {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT m.id AS match_id, m.game_slug, m.league_name, m.tournament_name, m.stage,
                m.team1_name, m.team1_logo, m.team2_name, m.team2_logo,
                m.team1_score, m.team2_score, m.best_of, m.status, m.scheduled_at,
                p.predicted_side, p.is_correct, p.points_awarded
           FROM PRO_PREDICTIONS p
           JOIN PRO_MATCHES m ON m.id = p.pro_match_id
          WHERE p.user_id = ?
          ORDER BY (m.scheduled_at IS NULL), m.scheduled_at DESC, m.id DESC
          LIMIT ${safeLimit}`,
        [userId]
      );
      return rows.map((r) => ({
        matchId: r.match_id as number,
        gameSlug: r.game_slug as string,
        leagueName: r.league_name ?? null,
        tournamentName: r.tournament_name ?? null,
        stage: r.stage ?? null,
        team1Name: r.team1_name ?? null,
        team1Logo: r.team1_logo ?? null,
        team2Name: r.team2_name ?? null,
        team2Logo: r.team2_logo ?? null,
        team1Score: r.team1_score ?? 0,
        team2Score: r.team2_score ?? 0,
        bestOf: r.best_of ?? null,
        status: r.status as string,
        scheduledAt: r.scheduled_at ? new Date(r.scheduled_at) : null,
        predictedSide: r.predicted_side as number,
        isCorrect: r.is_correct === null ? null : r.is_correct === 1 || r.is_correct === true,
        pointsAwarded: r.points_awarded ?? 0,
      }));
    } catch {
      this.logger.error("PredictionRepository", "findHistoryForUser failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findUnsettledSettleable(): Promise<SettleRow[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT p.id AS prediction_id, p.user_id, p.pro_match_id, p.predicted_side,
                m.team1_score, m.team2_score
           FROM PRO_PREDICTIONS p
           JOIN PRO_MATCHES m ON m.id = p.pro_match_id
          WHERE p.is_correct IS NULL
            AND m.status = 'finished'
            AND m.team1_score <> m.team2_score
          ORDER BY (m.scheduled_at IS NULL), m.scheduled_at ASC, m.id ASC`
      );
      return rows.map((r) => ({
        predictionId: r.prediction_id as number,
        userId: r.user_id as number,
        proMatchId: r.pro_match_id as number,
        predictedSide: r.predicted_side as number,
        team1Score: r.team1_score ?? 0,
        team2Score: r.team2_score ?? 0,
      }));
    } catch {
      this.logger.error("PredictionRepository", "findUnsettledSettleable failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async markSettled(predictionId: number, isCorrect: boolean, points: number): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "UPDATE PRO_PREDICTIONS SET is_correct = ?, points_awarded = ?, settled_at = NOW() WHERE id = ?",
        [isCorrect ? 1 : 0, points, predictionId]
      );
    } catch {
      this.logger.error("PredictionRepository", "markSettled failed");
    } finally {
      res.conn.release();
    }
  }

  async deleteUnsettledForCanceled(): Promise<number> {
    const res = await this.db.getWriteConnection();
    if (!res) return 0;
    try {
      const [result] = await res.conn.query<ResultSetHeader>(
        `DELETE p FROM PRO_PREDICTIONS p
           JOIN PRO_MATCHES m ON m.id = p.pro_match_id
          WHERE p.is_correct IS NULL AND m.status = 'canceled'`
      );
      return result.affectedRows;
    } catch {
      this.logger.error("PredictionRepository", "deleteUnsettledForCanceled failed");
      return 0;
    } finally {
      res.conn.release();
    }
  }
}
