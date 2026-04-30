import { TournamentRegistration } from "../../models/TournamentRegistration";
import { TournamentRegistrationStatus } from "../../enums/TournamentRegistrationStatus";

export interface ITournamentRegistrationRepository {
  registerTeam(reg: TournamentRegistration): Promise<boolean>;
  removeRegistration(tournamentId: number, teamId: number): Promise<boolean>;

  getTeamsForTournament(tournamentId: number): Promise<TournamentRegistration[]>;
  getTournamentsForTeam(teamId: number): Promise<TournamentRegistration[]>;

  updateStatus(
    tournamentId: number,
    teamId: number,
    status: TournamentRegistrationStatus
  ): Promise<boolean>;

  updateSeed(
    tournamentId: number,
    teamId: number,
    seed: number
  ): Promise<boolean>;

  exists(tournamentId: number, teamId: number): Promise<boolean>;
}