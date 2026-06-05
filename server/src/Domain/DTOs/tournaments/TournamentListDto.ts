import { TournamentFormat } from "../../enums/TournamentFormat";
import { TournamentStatus } from "../../enums/TournamentStatus";

export class TournamentListDto {
  constructor(
    public tournamentId: number,
    public gameId: number,
    public name: string,
    public format: TournamentFormat,
    public maxTeams: number,
    public registrationDeadline: Date,
    public prizePool: number,
    public status: TournamentStatus,
    public gameName: string,
    public registeredCount: number,
  ) {}
}
