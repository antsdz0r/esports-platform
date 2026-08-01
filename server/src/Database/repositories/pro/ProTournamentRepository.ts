import { RowDataPacket } from "mysql2";
import { IProTournamentRepository } from "../../../Domain/repositories/pro/IProTournamentRepository";
import { ProTournament } from "../../../Domain/models/ProTournament";
import { ProTournamentStatus } from "../../../Domain/enums/ProTournamentStatus";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProTournamentRepository implements IProTournamentRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProTournament {
    return new ProTournament(
      r.id, r.external_id, r.serie_external_id ?? null, r.league_external_id ?? null,
      r.game_slug, r.name, r.slug ?? null, r.tier ?? null,
      r.has_bracket === 1 || r.has_bracket === true, r.prizepool ?? null,
      r.status as ProTournamentStatus,
      r.begin_at ? new Date(r.begin_at) : null,
      r.end_at ? new Date(r.end_at) : null,
    );
  }

  async upsert(t: ProTournament): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        `INSERT INTO PRO_TOURNAMENTS
           (external_id, serie_external_id, league_external_id, game_slug, name, slug, tier,
            has_bracket, prizepool, status, begin_at, end_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           serie_external_id = VALUES(serie_external_id), league_external_id = VALUES(league_external_id),
           game_slug = VALUES(game_slug), name = VALUES(name), slug = VALUES(slug), tier = VALUES(tier),
           has_bracket = VALUES(has_bracket), prizepool = VALUES(prizepool), status = VALUES(status),
           begin_at = VALUES(begin_at), end_at = VALUES(end_at), synced_at = NOW()`,
        [
          t.externalId, t.serieExternalId, t.leagueExternalId, t.gameSlug, t.name, t.slug, t.tier,
          t.hasBracket ? 1 : 0, t.prizepool, t.status, t.beginAt, t.endAt,
        ]
      );
    } catch {
      this.logger.error("ProTournamentRepository", "upsert failed");
    } finally {
      res.conn.release();
    }
  }

  async findBySerie(serieExternalId: string): Promise<ProTournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_TOURNAMENTS WHERE serie_external_id = ? ORDER BY begin_at ASC",
        [serieExternalId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProTournamentRepository", "findBySerie failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findByExternalId(externalId: string): Promise<ProTournament | null> {
    const res = await this.db.getReadConnection();
    if (!res) return null;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_TOURNAMENTS WHERE external_id = ? LIMIT 1",
        [externalId]
      );
      return rows.length > 0 ? this.map(rows[0]) : null;
    } catch {
      this.logger.error("ProTournamentRepository", "findByExternalId failed");
      return null;
    } finally {
      res.conn.release();
    }
  }

  async findActiveByGame(gameSlug: string): Promise<ProTournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_TOURNAMENTS WHERE game_slug = ? AND status = 'running' ORDER BY begin_at ASC",
        [gameSlug]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProTournamentRepository", "findActiveByGame failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findByGame(gameSlug: string): Promise<ProTournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_TOURNAMENTS WHERE game_slug = ? ORDER BY begin_at DESC",
        [gameSlug]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProTournamentRepository", "findByGame failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findDistinctGames(): Promise<string[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        "SELECT DISTINCT game_slug FROM PRO_TOURNAMENTS ORDER BY game_slug ASC"
      );
      return rows.map((r) => r.game_slug as string);
    } catch {
      this.logger.error("ProTournamentRepository", "findDistinctGames failed");
      return [];
    } finally {
      res.conn.release();
    }
  }
}
