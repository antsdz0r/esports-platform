import { Team } from "../../models/Team";
import { TeamMemberWithUser } from "../../models/TeamMemberWithUser";
import { TeamInvite } from "../../models/TeamInvites";
import { CreateTeamData } from "../../models/CreateTeamData";
import { UpdateTeamData } from "../../models/UpdateTeamData";

export interface ITeamService {
  getMyTeams(userId: number): Promise<Team[]>;
  getCaptainTeams(userId: number): Promise<Team[]>;
  getById(teamId: number): Promise<Team>;
  getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]>;
  create(data: CreateTeamData): Promise<{ ok: boolean; team?: Team; error?: string }>;
  update(userId: number, teamId: number, data: UpdateTeamData): Promise<boolean>;
  delete(userId: number, teamId: number): Promise<boolean>;
  transferCaptain(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
  removeMember(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
  sendInvite(captainId: number, teamId: number, inviteeId: number): Promise<{ ok: boolean; error?: string }>;
  respondInvite(userId: number, inviteId: number, accept: boolean): Promise<{ ok: boolean; error?: string }>;
  getMyInvites(userId: number): Promise<TeamInvite[]>;
  getTeamPendingInvites(captainId: number, teamId: number): Promise<TeamInvite[]>;
}
