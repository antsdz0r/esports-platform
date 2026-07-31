export class ProSerie {
    constructor(
        public id: number = 0,
        public externalId: string = "",
        public leagueExternalId: string | null = null,
        public gameSlug: string = "",
        public fullName: string = "",
        public name: string | null = null,
        public year: number | null = null,
        public beginAt: Date | null = null,
        public endAt: Date | null = null,
    ) {}
}
