import { RowDataPacket } from "mysql2";
import { IProFavoriteRepository, FavoriteTournamentRow } from "../../../Domain/repositories/pro/IProFavoriteRepository";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProFavoriteRepository implements IProFavoriteRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  async add(userId: number, tournamentExternalId: string): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "INSERT IGNORE INTO PRO_FAVORITES (user_id, tournament_external_id) VALUES (?, ?)",
        [userId, tournamentExternalId]
      );
    } catch {
      this.logger.error("ProFavoriteRepository", "add failed");
    } finally {
      res.conn.release();
    }
  }

  async remove(userId: number, tournamentExternalId: string): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "DELETE FROM PRO_FAVORITES WHERE user_id = ? AND tournament_external_id = ?",
        [userId, tournamentExternalId]
      );
    } catch {
      this.logger.error("ProFavoriteRepository", "remove failed");
    } finally {
      res.conn.release();
    }
  }

  async listIds(userId: number): Promise<string[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT tournament_external_id FROM PRO_FAVORITES WHERE user_id = ?",
        [userId]
      );
      return rows.map((r) => r.tournament_external_id as string);
    } catch {
      this.logger.error("ProFavoriteRepository", "listIds failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async listForUser(userId: number): Promise<FavoriteTournamentRow[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT t.external_id, t.name, t.game_slug, t.tier, t.has_bracket, t.status, t.begin_at, t.end_at,
                l.name AS league_name, l.image_url AS league_image_url
           FROM PRO_FAVORITES f
           JOIN PRO_TOURNAMENTS t ON t.external_id = f.tournament_external_id
           LEFT JOIN PRO_LEAGUES l ON l.external_id = t.league_external_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC`,
        [userId]
      );
      return rows.map((r) => ({
        externalId: r.external_id as string,
        name: r.name as string,
        gameSlug: r.game_slug as string,
        tier: r.tier ?? null,
        hasBracket: r.has_bracket === 1 || r.has_bracket === true,
        status: r.status as string,
        beginAt: r.begin_at ? new Date(r.begin_at) : null,
        endAt: r.end_at ? new Date(r.end_at) : null,
        leagueName: r.league_name ?? null,
        leagueImageUrl: r.league_image_url ?? null,
      }));
    } catch {
      this.logger.error("ProFavoriteRepository", "listForUser failed");
      return [];
    } finally {
      res.conn.release();
    }
  }
}
