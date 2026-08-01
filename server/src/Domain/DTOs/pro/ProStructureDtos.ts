export class ProLeagueDto {
  constructor(
    public externalId: string,
    public name: string,
    public slug: string | null,
    public imageUrl: string | null,
    public hasActive: boolean,
  ) {}
}

export class ProSerieDto {
  constructor(
    public externalId: string,
    public fullName: string,
    public name: string | null,
    public year: number | null,
    public tournamentCount: number,
  ) {}
}

export class ProTournamentListDto {
  constructor(
    public externalId: string,
    public name: string,
    public gameSlug: string,
    public tier: string | null,
    public hasBracket: boolean,
    public status: string,
    public beginAt: string | null,
    public endAt: string | null,
    public leagueName: string | null,
    public serieName: string | null,
    public leagueImageUrl: string | null,
  ) {}
}

export class ProTournamentMatchDto {
  constructor(
    public externalId: string,
    public round: number | null,
    public position: number | null,
    public status: string,
    public team1Name: string | null,
    public team1Logo: string | null,
    public team2Name: string | null,
    public team2Logo: string | null,
    public team1Score: number,
    public team2Score: number,
    public bestOf: number | null,
    public scheduledAt: string | null,
  ) {}
}

export class ProStandingDto {
  constructor(
    public rank: number | null,
    public teamName: string | null,
    public teamLogo: string | null,
    public wins: number,
    public losses: number,
    public ties: number,
  ) {}
}

export class ProTournamentDetailDto {
  constructor(
    public externalId: string,
    public name: string,
    public gameSlug: string,
    public tier: string | null,
    public hasBracket: boolean,
    public status: string,
    public beginAt: string | null,
    public endAt: string | null,
    public matches: ProTournamentMatchDto[],
    public standings: ProStandingDto[],
  ) {}
}
