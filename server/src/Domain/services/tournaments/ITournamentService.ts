import { Tournament } from "../../models/Tournament";
import { TournamentRegistration } from "../../models/TournamentRegistration";
import { TournamentRegistrationStatus } from "../../enums/TournamentRegistrationStatus";
import { TournamentStatus } from "../../enums/TournamentStatus";

export interface ITournamentService {
  // ─── Turniri ───────────────────────────────────────────────────────
  getAll(filters?: { gameId?: number; status?: TournamentStatus }): Promise<Tournament[]>;
  getById(id: number): Promise<Tournament | null>;
  create(payload: {
    gameId: number;
    name: string;
    format: string;
    maxTeams: number;
    registrationDeadline: Date;
    prizePool?: number;
  }): Promise<Tournament | null>;
  update(
    id: number,
    payload: {
      gameId: number;
      name: string;
      format: string;
      maxTeams: number;
      registrationDeadline: Date;
      prizePool?: number;
      status?: TournamentStatus;
    }
  ): Promise<boolean>;
  delete(id: number): Promise<boolean>;

  // ─── Prijave timova ────────────────────────────────────────────────
  registerTeam(
    tournamentId: number,
    teamId: number,
    captainId: number
  ): Promise<{ ok: boolean; error?: string }>;
  unregisterTeam(tournamentId: number, teamId: number, captainId: number): Promise<boolean>;
  getRegistrations(tournamentId: number): Promise<TournamentRegistration[]>;
  updateRegistrationStatus(
    tournamentId: number,
    teamId: number,
    status: TournamentRegistrationStatus
  ): Promise<boolean>;


  // ─── Mečevi ────────────────────────────────────────────────────────
recordMatchResult(
  gameId: number,
  score: string,
  winnerTeamId: number
): Promise<{ ok: boolean; error?: string }>;

  // ─── Watchlist ─────────────────────────────────────────────────────
  watchTournament(userId: number, tournamentId: number): Promise<boolean>;
  unwatchTournament(userId: number, tournamentId: number): Promise<boolean>;

  // ─── Bracket ───────────────────────────────────────────────────────
  lockAndGenerateBracket(tournamentId: number): Promise<{ ok: boolean; error?: string }>;
}