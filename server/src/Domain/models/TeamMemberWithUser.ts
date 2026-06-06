import { TeamMemberRole } from "../enums/TeamMemberRole";

export class TeamMemberWithUser {
  constructor(
    public playerId: number = 0,
    public gamerTag: string = "",
    public fullName: string = "",
    public role: TeamMemberRole = TeamMemberRole.MEMBER,
    public joinedAt: Date = new Date(),
  ) {}
}
