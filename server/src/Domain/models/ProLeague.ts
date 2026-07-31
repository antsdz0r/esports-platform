export class ProLeague {
    constructor(
        public id: number = 0,
        public externalId: string = "",
        public gameSlug: string = "",
        public name: string = "",
        public slug: string | null = null,
        public imageUrl: string | null = null,
    ) {}
}
