import { RowDataPacket } from "mysql2";
import { IProStandingRepository } from "../../../Domain/repositories/pro/IProStandingRepository";
import { ProStanding } from "../../../Domain/models/ProStanding";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProStandingRepository implements IProStandingRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProStanding {
    return new ProStanding(
      r.id, r.tournament_external_id, r.rank_pos ?? null,
      r.team_name ?? null, r.team_logo ?? null,
      r.wins ?? 0, r.losses ?? 0, r.ties ?? 0,
    );
  }

  async replaceForTournament(tournamentExternalId: string, rows: ProStanding[]): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "DELETE FROM PRO_STANDINGS WHERE tournament_external_id = ?",
        [tournamentExternalId]
      );
      for (const s of rows) {
        await res.conn.execute(
          `INSERT INTO PRO_STANDINGS (tournament_external_id, rank_pos, team_name, team_logo, wins, losses, ties)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tournamentExternalId, s.rank, s.teamName, s.teamLogo, s.wins, s.losses, s.ties]
        );
      }
    } catch {
      this.logger.error("ProStandingRepository", "replaceForTournament failed");
    } finally {
      res.conn.release();
    }
  }

  async findByTournament(tournamentExternalId: string): Promise<ProStanding[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM PRO_STANDINGS WHERE tournament_external_id = ? ORDER BY (rank_pos IS NULL), rank_pos ASC",
        [tournamentExternalId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProStandingRepository", "findByTournament failed");
      return [];
    } finally {
      res.conn.release();
    }
  }
}
