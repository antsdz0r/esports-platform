export class ProStreamDto {
  constructor(
    public platform: string,
    public channel: string,
    public language: string,
    public isOfficial: boolean,
  ) {}
}

export class ProMatchDto {
  constructor(
    public id: number,
    public gameSlug: string,
    public leagueName: string | null,
    public serieName: string | null,
    public tournamentName: string | null,
    public stage: string | null,
    public team1Name: string | null,
    public team1Logo: string | null,
    public team2Name: string | null,
    public team2Logo: string | null,
    public team1Score: number,
    public team2Score: number,
    public bestOf: number | null,
    public status: string,
    public scheduledAt: string | null,
    public streams: ProStreamDto[],
  ) {}
}
