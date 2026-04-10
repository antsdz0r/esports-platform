export class GameCatalog {
    constructor(
        public gameId: number = 0,
        public name: string = "",
        public tag: string = "",
        public genre: string = "",
        public maxPlayers: number = 0,
    ){}
}
