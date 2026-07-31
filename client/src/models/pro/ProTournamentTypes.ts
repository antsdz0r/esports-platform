export interface ProLeagueDto {
  externalId: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  hasActive: boolean;
}

export interface ProSerieDto {
  externalId: string;
  fullName: string;
  name: string | null;
  year: number | null;
  tournamentCount: number;
}

export interface ProTournamentListDto {
  externalId: string;
  name: string;
  gameSlug: string;
  tier: string | null;
  hasBracket: boolean;
  status: string;
  beginAt: string | null;
  endAt: string | null;
  leagueName: string | null;
  serieName: string | null;
}

export interface ProTournamentMatchDto {
  externalId: string;
  round: number | null;
  position: number | null;
  status: string;
  team1Name: string | null;
  team1Logo: string | null;
  team2Name: string | null;
  team2Logo: string | null;
  team1Score: number;
  team2Score: number;
  bestOf: number | null;
  scheduledAt: string | null;
}

export interface ProStandingDto {
  rank: number | null;
  teamName: string | null;
  teamLogo: string | null;
  wins: number;
  losses: number;
  ties: number;
}

export interface ProTournamentDetailDto {
  externalId: string;
  name: string;
  gameSlug: string;
  tier: string | null;
  hasBracket: boolean;
  status: string;
  beginAt: string | null;
  endAt: string | null;
  matches: ProTournamentMatchDto[];
  standings: ProStandingDto[];
}
