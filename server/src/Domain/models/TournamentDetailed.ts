import { TournamentFormat } from "../enums/TournamentFormat";
import { TournamentStatus } from "../enums/TournamentStatus";

export class TournamentDetailed {
  constructor(
    public tournamentId: number = 0,
    public gameId: number = 0,
    public name: string = "",
    public format: TournamentFormat = TournamentFormat.SINGLE_ELIM,
    public maxTeams: number = 0,
    public registrationDeadline: Date = new Date(),
    public prizePool: number = 0,
    public status: TournamentStatus = TournamentStatus.OPEN,
    public gameName: string = "",
    public registeredCount: number = 0,
  ) {}
}
