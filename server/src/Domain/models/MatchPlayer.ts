export class MatchPlayer{
    constructor(
        public gameId : number = 0,
        public playerId : number = 0,
        public teamId : number = 0,
        public performance : string | null = null,
    ){}
}