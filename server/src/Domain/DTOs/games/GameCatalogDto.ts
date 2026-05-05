export class GameCatalogDto {
  constructor(
    public gameId: number,
    public name: string,
    public tag: string,
    public genre: string,
    public maxPlayers: number,
    public activeTournamentsCount: number,
  ) {}
}
