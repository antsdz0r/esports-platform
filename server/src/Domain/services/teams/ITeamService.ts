import { TeamDto } from "../../DTOs/teams/TeamDto";

export interface ITeamService {
  getMyTeams(userId: number): Promise<TeamDto[]>;
  getById(teamId: number): Promise<TeamDto | null>;
  create(payload: {
    userId: number;
    teamName: string;
    tag: string;
    logo: string;
    description?: string | null;
  }): Promise<TeamDto | null>;
  update(
    userId: number,
    teamId: number,
    payload: { teamName: string; tag: string; logo: string; description?: string | null }
  ): Promise<boolean>;
  delete(userId: number, teamId: number): Promise<boolean>;
  transferCaptain(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
  removeMember(userId: number, teamId: number, targetUserId: number): Promise<boolean>;
}
