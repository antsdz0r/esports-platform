import { MatchPlayer } from "../../models/MatchPlayer";

export interface IMatchPlayerRepository {
  getByGame(gameId: number): Promise<MatchPlayer[]>;
  addPlayer(entry: MatchPlayer): Promise<boolean>;
  updatePerformance(gameId: number, playerId: number, performance: string): Promise<boolean>;
  removePlayer(gameId: number, playerId: number): Promise<boolean>;
  exists(gameId: number, playerId: number): Promise<boolean>;
}