import { TournamentFormat } from "../enums/TournamentFormat";

export class CreateTournamentData {
  public constructor(
    public readonly gameId: number,
    public readonly name: string,
    public readonly format: TournamentFormat,
    public readonly maxTeams: number,
    public readonly registrationDeadline: Date,
    public readonly prizePool: number = 0,
    public readonly imageUrl: string | null = null,
  ) {}
}