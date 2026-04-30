import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITeamMemberRepository } from "../../../Domain/repositories/team_members/ITeamMemberRepository";
import { TeamMember } from "../../../Domain/models/TeamMember";
import { TeamMemberRole } from "../../../Domain/enums/TeamMemberRole";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class TeamMemberRepository implements ITeamMemberRepository {
  constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): TeamMember {
    return new TeamMember(
      r.team_id,
      r.player_id,
      r.role as TeamMemberRole,
      r.joined_at ? new Date(r.joined_at) : new Date()
    );
  }

  // 🔹 ADD MEMBER
  async addMember(member: TeamMember): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO TEAM_MEMBERS
        (team_id, player_id, role, joined_at)
        VALUES (?, ?, ?, NOW())
        `,
        [
          member.TeamId,
          member.playerId,
          member.role,
        ]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TeamMemberRepository", "addMember failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 REMOVE MEMBER
  async removeMember(teamId: number, playerId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        DELETE FROM TEAM_MEMBERS
        WHERE team_id = ? AND player_id = ?
        `,
        [teamId, playerId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TeamMemberRepository", "removeMember failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 GET MEMBERS OF TEAM
  async getMembersByTeam(teamId: number): Promise<TeamMember[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAM_MEMBERS WHERE team_id = ?`,
        [teamId]
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("TeamMemberRepository", "getMembersByTeam failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  // 🔹 GET TEAMS FOR PLAYER
  async getTeamsByPlayer(playerId: number): Promise<TeamMember[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAM_MEMBERS WHERE player_id = ?`,
        [playerId]
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("TeamMemberRepository", "getTeamsByPlayer failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  // 🔹 UPDATE ROLE (captain/member)
  async updateRole(
    teamId: number,
    playerId: number,
    role: TeamMemberRole
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE TEAM_MEMBERS
        SET role = ?
        WHERE team_id = ? AND player_id = ?
        `,
        [role, teamId, playerId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("TeamMemberRepository", "updateRole failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  // 🔹 EXISTS
  async exists(teamId: number, playerId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT COUNT(*) as cnt
        FROM TEAM_MEMBERS
        WHERE team_id = ? AND player_id = ?
        `,
        [teamId, playerId]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch (err) {
      this.logger.error("TeamMemberRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }
}