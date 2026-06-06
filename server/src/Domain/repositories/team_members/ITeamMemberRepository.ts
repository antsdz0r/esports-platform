import { TeamMember } from "../../models/TeamMember";
import { TeamMemberWithUser } from "../../models/TeamMemberWithUser";
import { TeamMemberRole } from "../../enums/TeamMemberRole";

export interface ITeamMemberRepository {
  addMember(member: TeamMember): Promise<boolean>;
  removeMember(teamId: number, playerId: number): Promise<boolean>;

  getMembersByTeam(teamId: number): Promise<TeamMember[]>;
  getMembersWithUserInfo(teamId: number): Promise<TeamMemberWithUser[]>;
  getTeamsByPlayer(playerId: number): Promise<TeamMember[]>;

  updateRole(teamId: number, playerId: number, role: TeamMemberRole): Promise<boolean>;

  exists(teamId: number, playerId: number): Promise<boolean>;
}