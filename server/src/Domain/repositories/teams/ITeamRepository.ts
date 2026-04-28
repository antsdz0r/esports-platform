import { Team } from "../../models/Team";

export interface ITeamRepository {
  create(team: Team): Promise<Team>;

  findById(teamId: number): Promise<Team>;
  findByName(teamName: string): Promise<Team>;
  findByTag(tag: string): Promise<Team>;
  findAll(): Promise<Team[]>;

  update(team: Team): Promise<boolean>;
  delete(teamId: number): Promise<boolean>;
  exists(teamId: number): Promise<boolean>;
}