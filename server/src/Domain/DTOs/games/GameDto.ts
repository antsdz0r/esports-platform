import { GameStatus } from "../../enums/GameStatus";

export class GameDto {
  constructor(
    public gameId: number,
    public tournamentId: number,
    public team1Id: number | null,
    public team2Id: number | null,
    public round: number,
    public score: string,
    public status: GameStatus,
    public winnerTeamId: number | null,
  ) {}
}