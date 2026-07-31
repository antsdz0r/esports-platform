import { ProMatchStatus } from "../enums/ProMatchStatus";

export class ProMatch {
    constructor(
        public id: number = 0,
        public externalId: string = "",
        public gameSlug: string = "",
        public leagueName: string | null = null,
        public serieName: string | null = null,
        public tournamentName: string | null = null,
        public stage: string | null = null,
        public team1Name: string | null = null,
        public team1Logo: string | null = null,
        public team2Name: string | null = null,
        public team2Logo: string | null = null,
        public team1Score: number = 0,
        public team2Score: number = 0,
        public bestOf: number | null = null,
        public status: ProMatchStatus = ProMatchStatus.UPCOMING,
        public scheduledAt: Date | null = null,
        public tournamentExternalId: string | null = null,
        public round: number | null = null,
        public position: number | null = null,
    ) {}
}
