
import { TeamMemberRole } from "../../Domain/enums/TeamMemberRole";
import { Team } from "../../Domain/models/Team";
import { TeamMember } from "../../Domain/models/TeamMember";
import { TeamMemberWithUser } from "../../Domain/models/TeamMemberWithUser";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { ITeamRepository } from "../../Domain/repositories/teams/ITeamRepository";
import { ITeamService } from "../../Domain/services/teams/ITeamService";
import { ITeamInviteRepository } from "../../Domain/repositories/team_invites/ITeamInvitesRepository";
import { TeamInvite } from "../../Domain/models/TeamInvites";



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
    const teams = await Promise.all(
        memberships.map((m) => this.teamRepo.findById(m.TeamId))
    );
    return teams.filter((t) => t.teamId !== 0);
  }

  async getById(teamId: number): Promise<Team> {
    return this.teamRepo.findById(teamId);
  }

  async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    return this.teamMemberRepo.getMembersWithUserInfo(teamId);
  }

  async create(payload: {
    userId: number;
    teamName: string;
    tag: string;
    logo: string;
    description?: string | null;
    }): Promise<{ ok: boolean; team?: Team; error?: string }> {
    const byName = await this.teamRepo.findByName(payload.teamName);
    if (byName.teamId !== 0) return { ok: false, error: "Tim sa tim imenom već postoji" };

    const byTag = await this.teamRepo.findByTag(payload.tag);
    if (byTag.teamId !== 0) return { ok: false, error: "Tim sa tim tagom već postoji" };

    const team = await this.teamRepo.create(
      new Team(0, payload.teamName, payload.tag, payload.logo, payload.description ?? null)
    );
    if (team.teamId === 0) return { ok: false, error: "Greška pri kreiranju tima" };

    const added = await this.teamMemberRepo.addMember(
      new TeamMember(team.teamId, payload.userId, TeamMemberRole.CAPTAIN, new Date())
    );
    if (!added) return { ok: false, error: "Greška pri dodavanju kapitena" };

    return { ok: true, team };
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
  public async sendInvite(captainId: number, teamId: number, inviteeId: number): Promise<{ ok: boolean; error?: string }> {
  const members = await this.teamMemberRepo.getMembersByTeam(teamId);
  const isCaptain = members.some((m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN);
  if (!isCaptain) return { ok: false, error: "Samo kapiten može slati pozivnice" };

  const alreadyMember = members.some((m) => m.playerId === inviteeId);
  if (alreadyMember) return { ok: false, error: "Igrač je već član tima" };

  const alreadyInvited = await this.teamInviteRepo.existsPending(teamId, inviteeId);
  if (alreadyInvited) return { ok: false, error: "Pozivnica već postoji" };

  const invite = await this.teamInviteRepo.create(teamId, captainId, inviteeId);
  return invite ? { ok: true } : { ok: false, error: "Greška pri slanju pozivnice" };
}

public async respondInvite(userId: number, inviteId: number, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  const invite = await this.teamInviteRepo.findById(inviteId);
  if (!invite) return { ok: false, error: "Pozivnica nije pronađena" };
  if (invite.inviteeId !== userId) return { ok: false, error: "Nije vaša pozivnica" };

  const status = accept ? "accepted" : "declined";
  const ok = await this.teamInviteRepo.respond(inviteId, status);
  if (!ok) return { ok: false, error: "Greška pri odgovoru na pozivnicu" };

  if (accept) {
    await this.teamMemberRepo.addMember(new TeamMember(invite.teamId, userId, TeamMemberRole.MEMBER, new Date()));
  }

  return { ok: true };
}

public async getMyInvites(userId: number): Promise<TeamInvite[]> {
  return this.teamInviteRepo.findPendingByInvitee(userId);
}

public async getTeamPendingInvites(captainId: number, teamId: number): Promise<TeamInvite[]> {
  const isCap = await this.isCaptain(captainId, teamId);
  if (!isCap) return [];
  return this.teamInviteRepo.findPendingByTeam(teamId);
}

}
