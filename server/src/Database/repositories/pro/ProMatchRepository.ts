import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IProMatchRepository } from "../../../Domain/repositories/pro/IProMatchRepository";
import { ProMatch } from "../../../Domain/models/ProMatch";
import { ProMatchStatus } from "../../../Domain/enums/ProMatchStatus";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProMatchRepository implements IProMatchRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProMatch {
    return new ProMatch(
      r.id,
      r.external_id,
      r.game_slug,
      r.league_name ?? null,
      r.serie_name ?? null,
      r.tournament_name ?? null,
      r.stage ?? null,
      r.team1_name ?? null,
      r.team1_logo ?? null,
      r.team2_name ?? null,
      r.team2_logo ?? null,
      r.team1_score ?? 0,
      r.team2_score ?? 0,
      r.best_of ?? null,
      r.status as ProMatchStatus,
      r.scheduled_at ? new Date(r.scheduled_at) : null,
    );
  }

  async upsert(match: ProMatch): Promise<number> {
    const res = await this.db.getWriteConnection();
    if (!res) return 0;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `INSERT INTO PRO_MATCHES
           (external_id, game_slug, league_name, serie_name, tournament_name, stage,
            team1_name, team1_logo, team2_name, team2_logo, team1_score, team2_score,
            best_of, status, scheduled_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id),
           game_slug = VALUES(game_slug),
           league_name = VALUES(league_name),
           serie_name = VALUES(serie_name),
           tournament_name = VALUES(tournament_name),
           stage = VALUES(stage),
           team1_name = VALUES(team1_name),
           team1_logo = VALUES(team1_logo),
           team2_name = VALUES(team2_name),
           team2_logo = VALUES(team2_logo),
           team1_score = VALUES(team1_score),
           team2_score = VALUES(team2_score),
           best_of = VALUES(best_of),
           status = VALUES(status),
           scheduled_at = VALUES(scheduled_at),
           synced_at = NOW()`,
        [
          match.externalId, match.gameSlug, match.leagueName, match.serieName,
          match.tournamentName, match.stage, match.team1Name, match.team1Logo,
          match.team2Name, match.team2Logo, match.team1Score, match.team2Score,
          match.bestOf, match.status, match.scheduledAt,
        ]
      );
      return result.insertId;
    } catch {
      this.logger.error("ProMatchRepository", "upsert failed");
      return 0;
    } finally {
      res.conn.release();
    }
  }

  async findFeed(limit: number): Promise<ProMatch[]> {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT * FROM PRO_MATCHES
         WHERE status IN ('live', 'upcoming')
            OR (status = 'finished' AND scheduled_at >= (NOW() - INTERVAL 2 DAY))
         ORDER BY
           (status = 'live') DESC,                                     -- 1) uzivo na vrhu
           (status = 'finished') ASC,                                  -- 2) pa predstojece, pa zavrseni
           CASE WHEN status = 'finished' THEN scheduled_at END DESC,   -- zavrseni: najnoviji prvi
           scheduled_at ASC                                            -- live/upcoming: najskoriji prvi
         LIMIT ${safeLimit}`
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProMatchRepository", "findFeed failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async exists(id: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        "SELECT 1 FROM PRO_MATCHES WHERE id = ? LIMIT 1",
        [id]
      );
      return rows.length > 0;
    } catch {
      this.logger.error("ProMatchRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
