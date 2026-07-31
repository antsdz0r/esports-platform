import { ProTournamentStatus } from "../enums/ProTournamentStatus";

export class ProTournament {
    constructor(
        public id: number = 0,
        public externalId: string = "",
        public serieExternalId: string | null = null,
        public leagueExternalId: string | null = null,
        public gameSlug: string = "",
        public name: string = "",
        public slug: string | null = null,
        public tier: string | null = null,
        public hasBracket: boolean = false,
        public prizepool: string | null = null,
        public status: ProTournamentStatus = ProTournamentStatus.UPCOMING,
        public beginAt: Date | null = null,
        public endAt: Date | null = null,
    ) {}
}
