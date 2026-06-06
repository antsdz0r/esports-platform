import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITournamentRepository } from "../../../Domain/repositories/tournaments/ITournamentRepository";
import { Tournament } from "../../../Domain/models/Tournament";
import { TournamentDetailed } from "../../../Domain/models/TournamentDetailed";
import { TournamentFormat } from "../../../Domain/enums/TournamentFormat";
import { TournamentStatus } from "../../../Domain/enums/TournamentStatus";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class TournamentRepository implements ITournamentRepository {
  constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): Tournament {
    return new Tournament(
      r.tournamentid,
      r.game_id,
      r.name,
      r.format as TournamentFormat,
      r.max_teams,
      new Date(r.registration_deadline),
      r.prize_pool,
      r.status as TournamentStatus,
      r.game_name ?? null,
      r.image_url ?? null,
    );
  }

  //  CREATE
  async create(t: Tournament): Promise<Tournament> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Tournament();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO TOURNAMENTS
        (game_id, name, format, max_teams, registration_deadline, prize_pool, status, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          t.gameId,
          t.name,
          t.format,
          t.maxTeams,
          t.registrationDeadLine,
          t.prizePool,
          t.status,
          t.imageUrl ?? null,
        ]
      );

      if (result.insertId === 0) return new Tournament();

      return new Tournament(
        result.insertId,
        t.gameId,
        t.name,
        t.format,
        t.maxTeams,
        t.registrationDeadLine,
        t.prizePool,
        t.status,
        null,
        t.imageUrl ?? null,
      );
    } catch {
      this.logger.error("TournamentRepository", "create failed");
      return new Tournament();
    } finally {
      res.conn.release();
    }
  }

  //  FIND BY ID
  async findById(id: number): Promise<Tournament> {
    const res = await this.db.getReadConnection();
    if (!res) return new Tournament();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT t.*, gc.name AS game_name
         FROM TOURNAMENTS t
         LEFT JOIN GAME_CATALOG gc ON t.game_id = gc.game_id
         WHERE t.tournamentid = ?`,
        [id]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Tournament();
    } catch {
      this.logger.error("TournamentRepository", "findById failed");
      return new Tournament();
    } finally {
      res.conn.release();
    }
  }

  private mapDetailed(r: RowDataPacket): TournamentDetailed {
    return new TournamentDetailed(
      r.tournamentid,
      r.game_id,
      r.name,
      r.format as TournamentFormat,
      r.max_teams,
      new Date(r.registration_deadline),
      Number(r.prize_pool),
      r.status as TournamentStatus,
      r.game_name ?? "",
      Number(r.registered_count ?? 0),
      r.image_url ?? null,
    );
  }

  async findAllDetailed(filters?: { gameId?: number; status?: TournamentStatus }): Promise<TournamentDetailed[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const conditions: string[] = [];
      const params: (number | string)[] = [];

      if (filters?.gameId) {
        conditions.push("t.game_id = ?");
        params.push(filters.gameId);
      }
      if (filters?.status) {
        conditions.push("t.status = ?");
        params.push(filters.status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT t.*, gc.name AS game_name,
          (SELECT COUNT(*) FROM TOURNAMENT_REGISTRATIONS tr WHERE tr.tournament_id = t.tournamentid) AS registered_count
        FROM TOURNAMENTS t
        LEFT JOIN GAME_CATALOG gc ON t.game_id = gc.game_id
        ${where}
        ORDER BY t.tournamentid ASC
        `,
        params,
      );

      return rows.map((r) => this.mapDetailed(r));
    } catch {
      this.logger.error("TournamentRepository", "findAllDetailed failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  //  FIND ALL
  async findAll(): Promise<Tournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TOURNAMENTS ORDER BY tournamentid ASC`
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TournamentRepository", "findAll failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  
  async findByGameId(gameId: number): Promise<Tournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TOURNAMENTS WHERE game_id = ? ORDER BY tournamentid ASC`,
        [gameId]
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TournamentRepository", "findByGameId failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  // hehe ;)
  async update(t: Tournament): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE TOURNAMENTS
        SET game_id = ?,
            name = ?,
            format = ?,
            max_teams = ?,
            registration_deadline = ?,
            prize_pool = ?,
            status = ?,
            image_url = ?
        WHERE tournamentid = ?
        `,
        [
          t.gameId,
          t.name,
          t.format,
          t.maxTeams,
          t.registrationDeadLine,
          t.prizePool,
          t.status,
          t.imageUrl ?? null,
          t.tournamentId,
        ]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRepository", "update failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  // lovac 
  async updateStatus(id: number, status: TournamentStatus): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE TOURNAMENTS SET status = ? WHERE tournamentid = ?`,
        [status, id]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRepository", "updateStatus failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  
  async delete(id: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `DELETE FROM TOURNAMENTS WHERE tournamentid = ?`,
        [id]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRepository", "delete failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  
  async exists(id: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM TOURNAMENTS WHERE tournamentid = ?`,
        [id]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("TournamentRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}