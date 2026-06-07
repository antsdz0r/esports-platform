import { TeamInvite } from "../../models/TeamInvites";

export interface ITeamInviteRepository {
  create(teamId: number, inviterId: number, inviteeId: number): Promise<TeamInvite | null>;
  findPendingByInvitee(inviteeId: number): Promise<TeamInvite[]>;
  findById(id: number): Promise<TeamInvite | null>;
  respond(id: number, status: "accepted" | "declined"): Promise<boolean>;
  existsPending(teamId: number, inviteeId: number): Promise<boolean>;
  findPendingByTeam(teamId: number): Promise<TeamInvite[]>;
}