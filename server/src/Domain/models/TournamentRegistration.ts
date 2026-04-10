import { TournamentRegistrationStatus } from '../enums/TournamentRegistrationStatus';

export class TournamentRegistration{
    constructor(
        public tournamentId : number = 0,
        public teamId : number = 0,
        public registeredAt : Date = new Date(),
        public status : TournamentRegistrationStatus = TournamentRegistrationStatus.PENDING,
        public seed : number | null = null,
    ){}
}