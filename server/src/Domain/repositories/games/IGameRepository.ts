import { Game } from "../../models/Game";
import { GameDto } from "../../DTOs/games/GameDto";
import { GameStatus } from "../../enums/GameStatus";

export interface IGameRepository {
  create(game: Game): Promise<Game>;

  findById(gameId: number): Promise<GameDto | null>;
  findAll(): Promise<GameDto[]>;

  findByTournamentId(tournamentId: number): Promise<GameDto[]>;
  findByTeamId(teamId: number): Promise<GameDto[]>;

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