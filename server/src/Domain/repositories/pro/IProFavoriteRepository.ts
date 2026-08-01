// Red iz JOIN-a favorita sa PRO_TOURNAMENTS + PRO_LEAGUES (za prikaz kartica).
export interface FavoriteTournamentRow {
  externalId: string;
  name: string;
  gameSlug: string;
  tier: string | null;
  hasBracket: boolean;
  status: string;
  beginAt: Date | null;
  endAt: Date | null;
  leagueName: string | null;
  leagueImageUrl: string | null;
}

export interface IProFavoriteRepository {
  add(userId: number, tournamentExternalId: string): Promise<void>;
  remove(userId: number, tournamentExternalId: string): Promise<void>;
  listIds(userId: number): Promise<string[]>;
  listForUser(userId: number): Promise<FavoriteTournamentRow[]>;
}
