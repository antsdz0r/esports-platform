import { Game } from "../../models/Game";
import { GameStatus } from "../../enums/GameStatus";
import { MatchPlayer } from "../../models/MatchPlayer";
import { MatchWithTeams } from "../../models/MatchWithTeams";

export interface IMatchService {
  getByTournament(tournamentId: number): Promise<MatchWithTeams[]>;
  getScheduled(limit: number): Promise<MatchWithTeams[]>;
  countWinsForUser(userId: number): Promise<number>;
  getById(gameId: number): Promise<{ game: Game; players: MatchPlayer[] }>;
  addPlayer(gameId: number, playerId: number, teamId: number, captainId: number): Promise<{ ok: boolean; error?: string }>;
  updatePerformance(gameId: number, playerId: number, captainId: number, performance: string): Promise<boolean>;
  removePlayer(gameId: number, playerId: number, captainId: number): Promise<boolean>;
  updateResult(gameId: number, score: string, winnerTeamId: number | null, status: GameStatus): Promise<boolean>;
  updateScheduledTime(gameId: number, scheduledTime: Date | null): Promise<boolean>;
}