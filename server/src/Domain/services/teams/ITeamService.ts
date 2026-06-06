
import { Team } from "../../models/Team";
import { TeamMemberWithUser } from "../../models/TeamMemberWithUser";
import { TeamInvite } from "../../models/TeamInvites";
export interface ITeamService {
  getMyTeams(userId: number): Promise<Team[]>;
  getById(teamId: number): Promise<Team>;
  getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]>;
  create(payload: {
    userId: number;
    teamName: string;
    tag: string;
    logo: string;
    description?: string | null;
  }): Promise<{ ok: boolean; team?: Team; error?: string }>;
  update(
    userId: number,
    teamId: number,
    payload: { teamName: string; tag: string; logo: string; description?: string | null }
  ): Promise<boolean>;
  delete(userId: number, teamId: number): Promise<boolean>;
  transferCaptain(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
  removeMember(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
  sendInvite(captainId: number, teamId: number, inviteeId: number): Promise<{ ok: boolean; error?: string }>;
  respondInvite(userId: number, inviteId: number, accept: boolean): Promise<{ ok: boolean; error?: string }>;
  getMyInvites(userId: number): Promise<TeamInvite[]>;
}
