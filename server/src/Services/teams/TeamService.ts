import { TeamDto } from "../../Domain/DTOs/teams/TeamDto";
import { TeamMemberDto } from "../../Domain/DTOs/teams/TeamMemberDto";
import { TeamMemberRole } from "../../Domain/enums/TeamMemberRole";
import { Team } from "../../Domain/models/Team";
import { TeamMember } from "../../Domain/models/TeamMember";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { ITeamRepository } from "../../Domain/repositories/teams/ITeamRepository";
import { ITeamService } from "../../Domain/services/teams/ITeamService";

export class TeamService implements ITeamService {
  public constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly teamMemberRepo: ITeamMemberRepository,
  ) {}

  private async toDto(team: Team): Promise<TeamDto> {
    const members = await this.teamMemberRepo.getMembersByTeam(team.teamId);
    return new TeamDto(
      team.teamId,
      team.teamName,
      team.tag,
      team.logo,
      team.description,
      members.map((m) => new TeamMemberDto(m.playerId, m.role, m.joinedAt))
    );
  }

  private async isCaptain(userId: number, teamId: number): Promise<boolean> {
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    return members.some((m) => m.playerId === userId && m.role === TeamMemberRole.CAPTAIN);
  }

  async getMyTeams(userId: number): Promise<TeamDto[]> {
    const memberships = await this.teamMemberRepo.getTeamsByPlayer(userId);
    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await this.teamRepo.findById(m.TeamId);
        return team.teamId === 0 ? null : this.toDto(team);
      })
    );
    return teams.filter((t): t is TeamDto => t !== null);
  }

  async getById(teamId: number): Promise<TeamDto | null> {
    const team = await this.teamRepo.findById(teamId);
    if (team.teamId === 0) return null;
    return this.toDto(team);
  }

  async create(payload: {
    userId: number;
    teamName: string;
    tag: string;
    logo: string;
    description?: string | null;
  }): Promise<TeamDto | null> {
    const byName = await this.teamRepo.findByName(payload.teamName);
    if (byName.teamId !== 0) return null;

    const byTag = await this.teamRepo.findByTag(payload.tag);
    if (byTag.teamId !== 0) return null;

    const team = await this.teamRepo.create(
      new Team(0, payload.teamName, payload.tag, payload.logo, payload.description ?? null)
    );
    if (team.teamId === 0) return null;

    const added = await this.teamMemberRepo.addMember(
      new TeamMember(team.teamId, payload.userId, TeamMemberRole.CAPTAIN, new Date())
    );
    if (!added) return null;

    return this.toDto(team);
  }

  async update(
    userId: number,
    teamId: number,
    payload: { teamName: string; tag: string; logo: string; description?: string | null }
  ): Promise<boolean> {
    const captain = await this.isCaptain(userId, teamId);
    if (!captain) return false;

    const byName = await this.teamRepo.findByName(payload.teamName);
    if (byName.teamId !== 0 && byName.teamId !== teamId) return false;

    const byTag = await this.teamRepo.findByTag(payload.tag);
    if (byTag.teamId !== 0 && byTag.teamId !== teamId) return false;

    return this.teamRepo.update(
      new Team(teamId, payload.teamName, payload.tag, payload.logo, payload.description ?? null)
    );
  }

  async delete(userId: number, teamId: number): Promise<boolean> {
    const captain = await this.isCaptain(userId, teamId);
    if (!captain) return false;
    return this.teamRepo.delete(teamId);
  }

  async transferCaptain(userId: number, teamId: number, targetUserId: number): Promise<boolean> {
    const captain = await this.isCaptain(userId, teamId);
    if (!captain) return false;

    const targetInTeam = await this.teamMemberRepo.exists(teamId, targetUserId);
    if (!targetInTeam) return false;

    const demoteOld = await this.teamMemberRepo.updateRole(teamId, userId, TeamMemberRole.MEMBER);
    if (!demoteOld) return false;
    return this.teamMemberRepo.updateRole(teamId, targetUserId, TeamMemberRole.CAPTAIN);
  }

  async removeMember(userId: number, teamId: number, targetUserId: number): Promise<boolean> {
    // Captain can remove members; users can leave their own membership if not captain.
    if (userId === targetUserId) {
      const members = await this.teamMemberRepo.getMembersByTeam(teamId);
      const me = members.find((m) => m.playerId === userId);
      if (!me) return false;
      if (me.role === TeamMemberRole.CAPTAIN) return false;
      return this.teamMemberRepo.removeMember(teamId, userId);
    }

    const captain = await this.isCaptain(userId, teamId);
    if (!captain) return false;
    return this.teamMemberRepo.removeMember(teamId, targetUserId);
  }
}
