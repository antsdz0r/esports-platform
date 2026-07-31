import { RowDataPacket } from "mysql2";
import { IProLeagueRepository } from "../../../Domain/repositories/pro/IProLeagueRepository";
import { ProLeague } from "../../../Domain/models/ProLeague";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProLeagueRepository implements IProLeagueRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProLeague {
    return new ProLeague(r.id, r.external_id, r.game_slug, r.name, r.slug ?? null, r.image_url ?? null);
  }

  async upsert(league: ProLeague): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        `INSERT INTO PRO_LEAGUES (external_id, game_slug, name, slug, image_url, synced_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           game_slug = VALUES(game_slug), name = VALUES(name),
           slug = VALUES(slug), image_url = VALUES(image_url), synced_at = NOW()`,
        [league.externalId, league.gameSlug, league.name, league.slug, league.imageUrl]
      );
    } catch {
      this.logger.error("ProLeagueRepository", "upsert failed");
    } finally {
      res.conn.release();
    }
  }

  async findByGame(gameSlug: string): Promise<ProLeague[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_LEAGUES WHERE game_slug = ? ORDER BY name ASC",
        [gameSlug]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProLeagueRepository", "findByGame failed");
      return [];
    } finally {
      res.conn.release();
    }
  }
}
