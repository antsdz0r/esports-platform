import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITeamRepository } from "../../../Domain/repositories/teams/ITeamRepository";
import { Team } from "../../../Domain/models/Team";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class TeamRepository implements ITeamRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): Team {
    return new Team(
      r.team_id,
      r.team_name,
      r.tag,
      r.logo,
      r.description
    );
  }

  async create(team: Team): Promise<Team> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Team();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO TEAMS
          (team_name, tag, logo, description)
        VALUES
          (?, ?, ?, ?)
        `,
        [
          team.teamName,
          team.tag,
          team.logo,
          team.description,
        ]
      );

      if (result.insertId === 0) return new Team();

      return new Team(
        result.insertId,
        team.teamName,
        team.tag,
        team.logo,
        team.description
      );
    } catch {
      this.logger.error("TeamRepository", "create failed");
      return new Team();
    } finally {
      res.conn.release();
    }
  }

  async findById(teamId: number): Promise<Team> {
    const res = await this.db.getReadConnection();
    if (!res) return new Team();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAMS WHERE team_id = ?`,
        [teamId]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Team();
    } catch {
      this.logger.error("TeamRepository", "findById failed");
      return new Team();
    } finally {
      res.conn.release();
    }
  }

  async findByName(teamName: string): Promise<Team> {
    const res = await this.db.getReadConnection();
    if (!res) return new Team();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAMS WHERE team_name = ?`,
        [teamName]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Team();
    } catch {
      this.logger.error("TeamRepository", "findByName failed");
      return new Team();
    } finally {
      res.conn.release();
    }
  }

  async findByTag(tag: string): Promise<Team> {
    const res = await this.db.getReadConnection();
    if (!res) return new Team();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAMS WHERE tag = ?`,
        [tag]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Team();
    } catch {
      this.logger.error("TeamRepository", "findByTag failed");
      return new Team();
    } finally {
      res.conn.release();
    }
  }

  async findAll(): Promise<Team[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAMS ORDER BY team_id ASC`
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TeamRepository", "findAll failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async update(team: Team): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE TEAMS
        SET team_name = ?,
            tag = ?,
            logo = ?,
            description = ?
        WHERE team_id = ?
        `,
        [
          team.teamName,
          team.tag,
          team.logo,
          team.description,
          team.teamId,
        ]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TeamRepository", "update failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async delete(teamId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `DELETE FROM TEAMS WHERE team_id = ?`,
        [teamId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("TeamRepository", "delete failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async exists(teamId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM TEAMS WHERE team_id = ?`,
        [teamId]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("TeamRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}