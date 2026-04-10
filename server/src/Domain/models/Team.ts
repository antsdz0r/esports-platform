export class Team{
    constructor(
        public teamId: number = 0,
        public teamName: string = "",
        public tag: string = "",
        public logo: string = "",
        public description: string | null = null,
    ){}
}