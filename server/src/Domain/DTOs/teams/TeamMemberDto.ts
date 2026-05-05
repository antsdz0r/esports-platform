import { TeamMemberRole } from "../../enums/TeamMemberRole";

export class TeamMemberDto {
  constructor(
    public playerId: number,
    public role: TeamMemberRole,
    public joinedAt: Date,
  ) {}
}
