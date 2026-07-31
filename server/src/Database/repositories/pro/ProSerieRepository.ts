import { RowDataPacket } from "mysql2";
import { IProSerieRepository } from "../../../Domain/repositories/pro/IProSerieRepository";
import { ProSerie } from "../../../Domain/models/ProSerie";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProSerieRepository implements IProSerieRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProSerie {
    return new ProSerie(
      r.id, r.external_id, r.league_external_id ?? null, r.game_slug,
      r.full_name, r.name ?? null, r.year ?? null,
      r.begin_at ? new Date(r.begin_at) : null,
      r.end_at ? new Date(r.end_at) : null,
    );
  }

  async upsert(serie: ProSerie): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        `INSERT INTO PRO_SERIES (external_id, league_external_id, game_slug, full_name, name, year, begin_at, end_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           league_external_id = VALUES(league_external_id), game_slug = VALUES(game_slug),
           full_name = VALUES(full_name), name = VALUES(name), year = VALUES(year),
           begin_at = VALUES(begin_at), end_at = VALUES(end_at), synced_at = NOW()`,
        [serie.externalId, serie.leagueExternalId, serie.gameSlug, serie.fullName, serie.name, serie.year, serie.beginAt, serie.endAt]
      );
    } catch {
      this.logger.error("ProSerieRepository", "upsert failed");
    } finally {
      res.conn.release();
    }
  }

  async findByLeague(leagueExternalId: string): Promise<ProSerie[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_SERIES WHERE league_external_id = ? ORDER BY year DESC, begin_at DESC",
        [leagueExternalId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProSerieRepository", "findByLeague failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findByExternalId(externalId: string): Promise<ProSerie | null> {
    const res = await this.db.getReadConnection();
    if (!res) return null;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_SERIES WHERE external_id = ? LIMIT 1",
        [externalId]
      );
      return rows.length > 0 ? this.map(rows[0]) : null;
    } catch {
      this.logger.error("ProSerieRepository", "findByExternalId failed");
      return null;
    } finally {
      res.conn.release();
    }
  }
}
