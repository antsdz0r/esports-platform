export class UpdateTeamData {
  public constructor(
    public readonly teamName: string,
    public readonly tag: string,
    public readonly logo: string = "",
    public readonly description: string | null = null,
  ) {}
}
