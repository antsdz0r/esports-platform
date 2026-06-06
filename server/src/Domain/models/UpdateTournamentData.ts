import { TournamentFormat } from "../enums/TournamentFormat";
import { TournamentStatus } from "../enums/TournamentStatus";

export class UpdateTournamentData {
  public constructor(
    public readonly gameId: number,
    public readonly name: string,
    public readonly format: TournamentFormat,
    public readonly maxTeams: number,
    public readonly registrationDeadline: Date,
    public readonly prizePool: number,
    public readonly status: TournamentStatus,
    public readonly imageUrl: string | null = null,
  ) {}
}