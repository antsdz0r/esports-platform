import { GameStatus } from "../../enums/GameStatus";

export class MatchWithTeamsDto {
  constructor(
    public gameId: number,
    public tournamentId: number,
    public team1Id: number | null,
    public team2Id: number | null,
    public team1Name: string | null,
    public team2Name: string | null,
    public round: number,
    public score: string,
    public status: GameStatus | string,
    public winnerTeamId: number | null,
  ) {}
}
