import { GameStatus } from "../enums/GameStatus";
import { BracketType } from "../enums/BracketType";

export class MatchWithTeams {
  constructor(
    public gameId: number = 0,
    public tournamentId: number = 0,
    public team1Id: number | null = null,
    public team2Id: number | null = null,
    public team1Name: string | null = null,
    public team2Name: string | null = null,
    public round: number = 0,
    public score: string = "0:0",
    public status: GameStatus | string = GameStatus.SCHEDULED,
    public winnerTeamId: number | null = null,
    public scheduledTime: Date | null = null,
    public bracket: BracketType | string = BracketType.UPPER,
  ) {}
}
