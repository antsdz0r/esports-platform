import { Game } from "../../models/Game";
import { GameStatus } from "../../enums/GameStatus";
import { MatchWithTeams } from "../../models/MatchWithTeams";

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
  // Cita iz mastera — koristi se u read-modify-write tokovima (npr. napredovanje bracketa)
  // da bi se izbeglo zastarelo stanje sa replika.
  findByIdMaster(gameId: number): Promise<Game>;
  findAll(): Promise<Game[]>;

  findByTournamentId(tournamentId: number): Promise<Game[]>;
  findByTournamentIdWithTeams(tournamentId: number): Promise<MatchWithTeams[]>;
  findScheduledWithTeams(limit: number): Promise<MatchWithTeams[]>;
  countWinsForUser(userId: number): Promise<number>;
  findByTeamId(teamId: number): Promise<Game[]>;

  update(game: Game): Promise<boolean>;
  updateStatus(gameId: number, status: GameStatus): Promise<boolean>;
  updateResult(
    gameId: number,
    score: string,
    winnerTeamId: number | null,
    status: GameStatus,
  ): Promise<boolean>;

  updateScheduledTime(gameId: number, scheduledTime: Date | null): Promise<boolean>;

  // Double elimination progression helpers
  setMatchLinks(
    gameId: number,
    winnerToMatch: number | null,
    winnerToSlot: number | null,
    loserToMatch: number | null,
    loserToSlot: number | null,
  ): Promise<boolean>;
  placeTeamInMatch(gameId: number, slot: number, teamId: number): Promise<boolean>;

  delete(gameId: number): Promise<boolean>;
  exists(gameId: number): Promise<boolean>;
}
