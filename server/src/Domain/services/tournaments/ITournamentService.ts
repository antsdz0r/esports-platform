import { Tournament } from "../../models/Tournament";
import { TournamentDetailed } from "../../models/TournamentDetailed";
import { TournamentRegistration } from "../../models/TournamentRegistration";
import { TournamentRegistrationStatus } from "../../enums/TournamentRegistrationStatus";
import { TournamentStatus } from "../../enums/TournamentStatus";
import { CreateTournamentData } from "../../models/CreateTournamentData";
import { UpdateTournamentData } from "../../models/UpdateTournamentData";

export interface ITournamentService {
  getAll(filters?: { gameId?: number; status?: TournamentStatus }): Promise<Tournament[]>;
  getAllDetailed(filters?: { gameId?: number; status?: TournamentStatus }): Promise<TournamentDetailed[]>;
  getMyWatchlist(userId: number): Promise<TournamentDetailed[]>;
  getById(id: number): Promise<Tournament>;
  create(data: CreateTournamentData): Promise<{ ok: boolean; tournament?: Tournament; error?: string }>;
  update(id: number, data: UpdateTournamentData): Promise<boolean>;
  delete(id: number): Promise<boolean>;

  registerTeam(tournamentId: number, teamId: number, captainId: number): Promise<{ ok: boolean; error?: string }>;
  unregisterTeam(tournamentId: number, teamId: number, captainId: number): Promise<boolean>;
  getRegistrations(tournamentId: number): Promise<TournamentRegistration[]>;
  getMyRegistrations(userId: number): Promise<{ tournamentId: number; teamId: number }[]>;
  updateRegistrationStatus(tournamentId: number, teamId: number, status: TournamentRegistrationStatus): Promise<boolean>;

  recordMatchResult(gameId: number, score: string, winnerTeamId: number): Promise<{ ok: boolean; error?: string }>;

  watchTournament(userId: number, tournamentId: number): Promise<boolean>;
  unwatchTournament(userId: number, tournamentId: number): Promise<boolean>;

  lockAndGenerateBracket(tournamentId: number): Promise<{ ok: boolean; error?: string }>;
  advanceBracket(tournamentId: number): Promise<{ ok: boolean; error?: string; advanced?: number }>;
}
