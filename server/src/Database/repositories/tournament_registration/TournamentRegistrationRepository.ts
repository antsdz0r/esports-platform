import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITournamentRegistrationRepository } from "../../../Domain/repositories/tournament_registration/ITournamentRegistrationRepository";
import { TournamentRegistration } from "../../../Domain/models/TournamentRegistration";
import { TournamentRegistrationStatus } from "../../../Domain/enums/TournamentRegistrationStatus";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class TournamentRegistrationRepository implements ITournamentRegistrationRepository {
  constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): TournamentRegistration {
    return new TournamentRegistration(
      r.tournament_id,
      r.team_id,
      r.registered_at ? new Date(r.registered_at) : new Date(),
      r.status as TournamentRegistrationStatus,
      r.seed
    );
  }

  //  REGISTER TEAM
  async registerTeam(reg: TournamentRegistration): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO TOURNAMENT_REGISTRATIONS
        (tournament_id, team_id, registered_at, status, seed)
        VALUES (?, ?, NOW(), ?, ?)
        `,
        [
          reg.tournamentId,
          reg.teamId,
          reg.status,
          reg.seed,
        ]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRegistrationRepository", "registerTeam failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  
  async removeRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        DELETE FROM TOURNAMENT_REGISTRATIONS
        WHERE tournament_id = ? AND team_id = ?
        `,
        [tournamentId, teamId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRegistrationRepository", "removeRegistration failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  //  GET TEAMS FOR TOURNAMENT
  async getTeamsForTournament(tournamentId: number): Promise<TournamentRegistration[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT * FROM TOURNAMENT_REGISTRATIONS
        WHERE tournament_id = ?
        `,
        [tournamentId]
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TournamentRegistrationRepository", "getTeamsForTournament failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  //  GET TOURNAMENTS FOR TEAM
  async getTournamentsForTeam(teamId: number): Promise<TournamentRegistration[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT * FROM TOURNAMENT_REGISTRATIONS
        WHERE team_id = ?
        `,
        [teamId]
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TournamentRegistrationRepository", "getTournamentsForTeam failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  //  UPDATE STATUS
  async updateStatus(
    tournamentId: number,
    teamId: number,
    status: TournamentRegistrationStatus
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE TOURNAMENT_REGISTRATIONS
        SET status = ?
        WHERE tournament_id = ? AND team_id = ?
        `,
        [status, tournamentId, teamId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRegistrationRepository", "updateStatus failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  //  UPDATE SEED
  async updateSeed(
    tournamentId: number,
    teamId: number,
    seed: number
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE TOURNAMENT_REGISTRATIONS
        SET seed = ?
        WHERE tournament_id = ? AND team_id = ?
        `,
        [seed, tournamentId, teamId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TournamentRegistrationRepository", "updateSeed failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  //  EXISTS
  async exists(tournamentId: number, teamId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT COUNT(*) as cnt
        FROM TOURNAMENT_REGISTRATIONS
        WHERE tournament_id = ? AND team_id = ?
        `,
        [tournamentId, teamId]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("TournamentRegistrationRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}