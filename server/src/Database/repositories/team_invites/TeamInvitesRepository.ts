import { RowDataPacket, ResultSetHeader } from "mysql2";
import { ITeamInviteRepository } from "../../../Domain/repositories/team_invites/ITeamInvitesRepository";
import { TeamInvite } from "../../../Domain/models/TeamInvites";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class TeamInviteRepository implements ITeamInviteRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): TeamInvite {
    return new TeamInvite(r.id, r.team_id, r.inviter_id, r.invitee_id, r.status, new Date(r.created_at), r.team_name ?? null);
  }

  public async create(teamId: number, inviterId: number, inviteeId: number): Promise<TeamInvite> {
    const res = await this.db.getWriteConnection();
    if (!res) return new TeamInvite();
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `INSERT INTO TEAM_INVITES (team_id, inviter_id, invitee_id) VALUES (?, ?, ?)`,
        [teamId, inviterId, inviteeId]
      );
      return result.insertId > 0 ? new TeamInvite(result.insertId, teamId, inviterId, inviteeId) : new TeamInvite();
    } catch {
      this.logger.error("TeamInviteRepository", "create failed");
      return new TeamInvite();
    } finally {
      res.conn.release();
    }
  }

  public async findPendingByInvitee(inviteeId: number): Promise<TeamInvite[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT ti.*, t.team_name
         FROM TEAM_INVITES ti
         LEFT JOIN TEAMS t ON ti.team_id = t.team_id
         WHERE ti.invitee_id = ? AND ti.status = 'pending'`,
        [inviteeId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TeamInviteRepository", "findPendingByInvitee failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  public async findById(id: number): Promise<TeamInvite> {
    const res = await this.db.getReadConnection();
    if (!res) return new TeamInvite();
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAM_INVITES WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? this.map(rows[0]) : new TeamInvite();
    } catch {
      this.logger.error("TeamInviteRepository", "findById failed");
      return new TeamInvite();
    } finally {
      res.conn.release();
    }
  }

  public async respond(id: number, status: "accepted" | "declined"): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE TEAM_INVITES SET status = ? WHERE id = ? AND status = 'pending'`,
        [status, id]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("TeamInviteRepository", "respond failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  public async findPendingByTeam(teamId: number): Promise<TeamInvite[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM TEAM_INVITES WHERE team_id = ? AND status = 'pending'`,
        [teamId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("TeamInviteRepository", "findPendingByTeam failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  public async existsPending(teamId: number, inviteeId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM TEAM_INVITES WHERE team_id = ? AND invitee_id = ? AND status = 'pending'`,
        [teamId, inviteeId]
      );
      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("TeamInviteRepository", "existsPending failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
