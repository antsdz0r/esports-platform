import { Tournament } from "../../models/Tournament";
import { TournamentStatus } from "../../enums/TournamentStatus";

export interface ITournamentRepository {
  create(tournament: Tournament): Promise<Tournament>;

  findById(tournamentId: number): Promise<Tournament>;
  findAll(): Promise<Tournament[]>;
  findByGameId(gameId: number): Promise<Tournament[]>;

  update(tournament: Tournament): Promise<boolean>;
  updateStatus(tournamentId: number, status: TournamentStatus): Promise<boolean>;

  delete(tournamentId: number): Promise<boolean>;
  exists(tournamentId: number): Promise<boolean>;
}