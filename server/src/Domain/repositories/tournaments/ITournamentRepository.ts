import { Tournament } from "../../models/Tournament";
import { TournamentStatus } from "../../enums/TournamentStatus";
import { TournamentDetailed } from "../../models/TournamentDetailed";

export interface ITournamentRepository {
  create(tournament: Tournament): Promise<Tournament>;

  findById(tournamentId: number): Promise<Tournament>;
  findAll(): Promise<Tournament[]>;
  findAllDetailed(filters?: { gameId?: number; status?: TournamentStatus }): Promise<TournamentDetailed[]>;
  findByGameId(gameId: number): Promise<Tournament[]>;

  update(tournament: Tournament): Promise<boolean>;
  updateStatus(tournamentId: number, status: TournamentStatus): Promise<boolean>;

  delete(tournamentId: number): Promise<boolean>;
  exists(tournamentId: number): Promise<boolean>;
}