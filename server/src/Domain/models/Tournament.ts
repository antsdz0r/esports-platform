import { TournamentFormat } from "../enums/TournamentFormat";
import { TournamentStatus } from "../enums/TournamentStatus";


export class Tournament{
    constructor(
        public tournamentId : number = 0,
        public gameId : number = 0,
        public name: string = "",
        public format : TournamentFormat = TournamentFormat.SINGLE_ELIM,
        public maxTeams : number = 0,
        public registrationDeadLine : Date = new Date(),
        public prizePool : number = 0,
        public status : TournamentStatus = TournamentStatus.OPEN,
        public gameName : string | null = null,
        public imageUrl : string | null = null,
    ){}
}