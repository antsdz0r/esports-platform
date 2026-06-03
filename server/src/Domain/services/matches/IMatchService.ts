import { Game } from "../../models/Game";
import { MatchPlayer } from "../../models/MatchPlayer";

export interface IMatchService {
  getByTournament(tournamentId: number): Promise<Game[]>;
  getById(gameId: number): Promise<{ game: Game; players: MatchPlayer[] }>;
  addPlayer(gameId: number, playerId: number, teamId: number, captainId: number): Promise<{ ok: boolean; error?: string }>;
  updatePerformance(gameId: number, playerId: number, captainId: number, performance: string): Promise<boolean>;
  removePlayer(gameId: number, playerId: number, captainId: number): Promise<boolean>;
}