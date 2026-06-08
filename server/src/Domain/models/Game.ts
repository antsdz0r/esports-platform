import { GameStatus} from "../enums/GameStatus";
import { BracketType } from "../enums/BracketType";

export class Game{
    constructor(
        public gameId : number = 0,
        public tournamentId : number = 0,
        public team1Id : number | null = null,
        public team2Id : number | null = null,
        public round : number = 1,
        public score : string = "0:0",
        public status: GameStatus = GameStatus.SCHEDULED,
        public winnerTeamId : number | null = null,
        public scheduledTime : Date | null = null,
        public bracket : BracketType = BracketType.UPPER,
        public winnerToMatch : number | null = null,
        public winnerToSlot : number | null = null,
        public loserToMatch : number | null = null,
        public loserToSlot : number | null = null,
    ){}
}
