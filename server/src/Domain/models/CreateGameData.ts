export class CreateGameData {
  public constructor(
    public readonly name: string,
    public readonly tag: string,
    public readonly genre: string,
    public readonly maxPlayers: number,
    public readonly imageUrl: string | null = null,
  ) {}
}
