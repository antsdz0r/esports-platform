import { TeamMemberDto } from "./TeamMemberDto";

export class TeamDto {
  constructor(
    public teamId: number,
    public teamName: string,
    public tag: string,
    public logo: string,
    public description: string | null,
    public members: TeamMemberDto[],
  ) {}
}
