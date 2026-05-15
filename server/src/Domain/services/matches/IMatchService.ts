import { GameDto } from "../../DTOs/games/GameDto";
import { MatchPlayer } from "../../models/MatchPlayer";

export interface IMatchService {
  getByTournament(tournamentId: number): Promise<GameDto[]>;
  getById(gameId: number): Promise<{ game: GameDto; players: MatchPlayer[] } | null>;
  addPlayer(gameId: number, playerId: number, teamId: number, captainId: number): Promise<{ ok: boolean; error?: string }>;
  updatePerformance(gameId: number, playerId: number, captainId: number, performance: string): Promise<boolean>;
  removePlayer(gameId: number, playerId: number, captainId: number): Promise<boolean>;
}