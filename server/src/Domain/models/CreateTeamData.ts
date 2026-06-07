export class CreateTeamData {
  public constructor(
    public readonly userId: number,
    public readonly teamName: string,
    public readonly tag: string,
    public readonly logo: string = "",
    public readonly description: string | null = null,
  ) {}
}
