export class ProStanding {
    constructor(
        public id: number = 0,
        public tournamentExternalId: string = "",
        public rank: number | null = null,
        public teamName: string | null = null,
        public teamLogo: string | null = null,
        public wins: number = 0,
        public losses: number = 0,
        public ties: number = 0,
    ) {}
}
