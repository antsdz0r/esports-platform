import { TeamMemberRole } from "../../Domain/enums/TeamMemberRole";
import { Team } from "../../Domain/models/Team";
import { TeamMember } from "../../Domain/models/TeamMember";
import { TeamMemberWithUser } from "../../Domain/models/TeamMemberWithUser";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { ITeamRepository } from "../../Domain/repositories/teams/ITeamRepository";
import { ITeamService } from "../../Domain/services/teams/ITeamService";
import { ITeamInviteRepository } from "../../Domain/repositories/team_invites/ITeamInvitesRepository";
import { TeamInvite } from "../../Domain/models/TeamInvites";
import { CreateTeamData } from "../../Domain/models/CreateTeamData";
import { UpdateTeamData } from "../../Domain/models/UpdateTeamData";

export class TeamService implements ITeamService {
  public constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly teamMemberRepo: ITeamMemberRepository,
    private readonly teamInviteRepo: ITeamInviteRepository,
  ) {}

  private async isCaptain(userId: number, teamId: number): Promise<boolean> {
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    return members.some((m) => m.playerId === userId && m.role === TeamMemberRole.CAPTAIN);
  }

  async getMyTeams(userId: number): Promise<Team[]> {
    const memberships = await this.teamMemberRepo.getTeamsByPlayer(userId);
    const teams = await Promise.all(memberships.map((m) => this.teamRepo.findById(m.TeamId)));
    return teams.filter((t) => t.teamId !== 0);
  }

  async getCaptainTeams(userId: number): Promise<Team[]> {
    const memberships = await this.teamMemberRepo.getTeamsByPlayer(userId);
    const captainMemberships = memberships.filter((m) => m.role === TeamMemberRole.CAPTAIN);
    const teams = await Promise.all(captainMemberships.map((m) => this.teamRepo.findById(m.TeamId)));
    return teams.filter((t) => t.teamId !== 0);
  }

  async getById(teamId: number): Promise<Team> {
    return this.teamRepo.findById(teamId);
  }

  async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    return this.teamMemberRepo.getMembersWithUserInfo(teamId);
  }

  async create(data: CreateTeamData): Promise<{ ok: boolean; team?: Team; error?: string }> {
    const byName = await this.teamRepo.findByName(data.teamName);
    if (byName.teamId !== 0) return { ok: false, error: "A team with that name already exists" };

    const byTag = await this.teamRepo.findByTag(data.tag);
    if (byTag.teamId !== 0) return { ok: false, error: "A team with that tag already exists" };

    const team = await this.teamRepo.create(
      new Team(0, data.teamName, data.tag, data.logo, data.description ?? null)
    );
    if (team.teamId === 0) return { ok: false, error: "Failed to create team" };

    const added = await this.teamMemberRepo.addMember(
      new TeamMember(team.teamId, data.userId, TeamMemberRole.CAPTAIN, new Date())
    );
    if (!added) return { ok: false, error: "Failed to add captain" };

    return { ok: true, team };
  }

  async update(userId: number, teamId: number, data: UpdateTeamData): Promise<boolean> {
    const captain = await this.isCaptain(userId, teamId);
    if (!captain) return false;

    const byName = await this.teamRepo.findByName(data.teamName);
    if (byName.teamId !== 0 && byName.teamId !== teamId) return false;

    const byTag = await this.teamRepo.findByTag(data.tag);
    if (byTag.teamId !== 0 && byTag.teamId !== teamId) return false;

    return this.teamRepo.update(
      new Team(teamId, data.teamName, data.tag, data.logo, data.description ?? null)
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

  async sendInvite(captainId: number, teamId: number, inviteeId: number): Promise<{ ok: boolean; error?: string }> {
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some((m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN);
    if (!isCaptain) return { ok: false, error: "Only the captain can send invites" };

    const alreadyMember = members.some((m) => m.playerId === inviteeId);
    if (alreadyMember) return { ok: false, error: "Player is already a team member" };

    const alreadyInvited = await this.teamInviteRepo.existsPending(teamId, inviteeId);
    if (alreadyInvited) return { ok: false, error: "Invite already exists" };

    const invite = await this.teamInviteRepo.create(teamId, captainId, inviteeId);
    return invite.id !== 0 ? { ok: true } : { ok: false, error: "Failed to send invite" };
  }

  async respondInvite(userId: number, inviteId: number, accept: boolean): Promise<{ ok: boolean; error?: string }> {
    const invite = await this.teamInviteRepo.findById(inviteId);
    if (invite.id === 0) return { ok: false, error: "Invite not found" };
    if (invite.inviteeId !== userId) return { ok: false, error: "This isn't your invite" };

    const status = accept ? "accepted" : "declined";
    const ok = await this.teamInviteRepo.respond(inviteId, status);
    if (!ok) return { ok: false, error: "Failed to respond to invite" };

    if (accept) {
      await this.teamMemberRepo.addMember(new TeamMember(invite.teamId, userId, TeamMemberRole.MEMBER, new Date()));
    }

    return { ok: true };
  }

  async getMyInvites(userId: number): Promise<TeamInvite[]> {
    return this.teamInviteRepo.findPendingByInvitee(userId);
  }

  async getTeamPendingInvites(captainId: number, teamId: number): Promise<TeamInvite[]> {
    const isCap = await this.isCaptain(captainId, teamId);
    if (!isCap) return [];
    return this.teamInviteRepo.findPendingByTeam(teamId);
  }
}
