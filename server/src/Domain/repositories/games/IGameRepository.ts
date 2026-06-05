import { Game } from "../../models/Game";
import { GameStatus } from "../../enums/GameStatus";
import { MatchWithTeamsDto } from "../../DTOs/games/MatchWithTeamsDto";

export interface IGameRepository {
  create(game: Game): Promise<Game>;
  createMatch(
  tournamentId: number,
  team1Id: number | null,
  team2Id: number | null,
  round: number
): Promise<boolean>;

  deleteMatchesForTournament(tournamentId: number): Promise<boolean>;

  findById(gameId: number): Promise<Game>;
  findAll(): Promise<Game[]>;

  findByTournamentId(tournamentId: number): Promise<Game[]>;
  findByTournamentIdWithTeams(tournamentId: number): Promise<MatchWithTeamsDto[]>;
  findScheduledWithTeams(limit: number): Promise<MatchWithTeamsDto[]>;
  countWinsForUser(userId: number): Promise<number>;
  findByTeamId(teamId: number): Promise<Game[]>;

  update(game: Game): Promise<boolean>;
  updateStatus(gameId: number, status: GameStatus): Promise<boolean>;
  updateResult(
    gameId: number,
    score: string,
    winnerTeamId: number | null
  ): Promise<boolean>;

  delete(gameId: number): Promise<boolean>;
  exists(gameId: number): Promise<boolean>;
}