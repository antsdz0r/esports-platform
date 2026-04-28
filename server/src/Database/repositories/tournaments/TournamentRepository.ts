import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITournamentRepository } from "../../../Domain/repositories/tournaments/ITournamentRepository";
import { Tournament } from "../../../Domain/models/Tournament";
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
      r.status as TournamentStatus
    );
  }

  // 🔹 CREATE
  async create(t: Tournament): Promise<Tournament> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Tournament();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO TOURNAMENTS
        (game_id, name, format, max_teams, registration_deadline, prize_pool, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          t.gameId,
          t.name,
          t.format,
          t.maxTeams,
          t.registrationDeadLine,
          t.prizePool,
          t.status,
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
        t.status
      );
    } catch (err) {
      this.logger.error("TournamentRepository", "create failed", err);
      return new Tournament();
    } finally {
      res.conn.release();
    }
  }

  // 🔹 FIND BY ID
  async findById(id: number): Promise<Tournament> {
    const res = await this.db.getReadConnection();
    if (!res) return new Tournament();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TOURNAMENTS WHERE tournamentid = ?`,
        [id]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Tournament();
    } catch (err) {
      this.logger.error("TournamentRepository", "findById failed", err);
      return new Tournament();
    } finally {
      res.conn.release();
    }
  }

  // 🔹 FIND ALL
  async findAll(): Promise<Tournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TOURNAMENTS ORDER BY tournamentid ASC`
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("TournamentRepository", "findAll failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  // 🔹 FIND BY GAME
  async findByGameId(gameId: number): Promise<Tournament[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TOURNAMENTS WHERE game_id = ? ORDER BY tournamentid ASC`,
        [gameId]
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("TournamentRepository", "findByGameId failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  // 🔹 UPDATE
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
            status = ?
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
          t.tournamentId,
        ]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TournamentRepository", "update failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 UPDATE STATUS
  async updateStatus(id: number, status: TournamentStatus): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE TOURNAMENTS SET status = ? WHERE tournamentid = ?`,
        [status, id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TournamentRepository", "updateStatus failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 DELETE
  async delete(id: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `DELETE FROM TOURNAMENTS WHERE tournamentid = ?`,
        [id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TournamentRepository", "delete failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 EXISTS
  async exists(id: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM TOURNAMENTS WHERE tournamentid = ?`,
        [id]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch (err) {
      this.logger.error("TournamentRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }
}