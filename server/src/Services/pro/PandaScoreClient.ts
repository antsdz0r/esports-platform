import { ILoggerService } from "../../Domain/services/logger/ILoggerService";

// Minimalni oblik PandaScore match objekta — samo polja koja koristimo.
export interface PsOpponentRef {
  id?: number;
  name?: string | null;
  acronym?: string | null;
  image_url?: string | null;
}
export interface PsOpponent {
  type?: string;
  opponent?: PsOpponentRef | null;
}
export interface PsResult {
  team_id?: number | null;
  player_id?: number | null;
  score?: number | null;
}
export interface PsStream {
  raw_url?: string | null;
  embed_url?: string | null;
  language?: string | null;
  main?: boolean | null;
  official?: boolean | null;
}
export interface PsMatch {
  id: number;
  name?: string | null;
  status?: string | null;
  begin_at?: string | null;
  scheduled_at?: string | null;
  number_of_games?: number | null;
  videogame?: { slug?: string | null; name?: string | null } | null;
  league?: { name?: string | null } | null;
  serie?: { full_name?: string | null; name?: string | null } | null;
  tournament?: { name?: string | null } | null;
  opponents?: PsOpponent[] | null;
  results?: PsResult[] | null;
  streams_list?: PsStream[] | null;
  tournament_id?: number | null;
  serie_id?: number | null;
  league_id?: number | null;
  winner_id?: number | null;
  position?: number | null;
  previous_matches?: { match_id?: number | null; type?: string | null }[] | null;
}

// Struktura turnira (League -> Serie -> Tournament) i standings.
export interface PsLeague {
  id: number;
  name?: string | null;
  slug?: string | null;
  image_url?: string | null;
  videogame?: { slug?: string | null } | null;
}
export interface PsSerie {
  id: number;
  full_name?: string | null;
  name?: string | null;
  year?: number | null;
  begin_at?: string | null;
  end_at?: string | null;
  league_id?: number | null;
  videogame?: { slug?: string | null } | null;
}
export interface PsTournament {
  id: number;
  name?: string | null;
  slug?: string | null;
  tier?: string | null;
  has_bracket?: boolean | null;
  prizepool?: string | null;
  begin_at?: string | null;
  end_at?: string | null;
  serie_id?: number | null;
  league_id?: number | null;
  videogame?: { slug?: string | null } | null;
  league?: { id?: number | null; name?: string | null; slug?: string | null; image_url?: string | null } | null;
  serie?: { id?: number | null; full_name?: string | null; name?: string | null; year?: number | null } | null;
}
export interface PsStandingRow {
  rank?: number | null;
  last_position?: number | null;
  wins?: number | null;
  losses?: number | null;
  ties?: number | null;
  team?: { id?: number | null; name?: string | null; acronym?: string | null; image_url?: string | null } | null;
}

export class PandaScoreClient {
  private readonly base = "https://api.pandascore.co";

  public constructor(
    private readonly logger: ILoggerService,
    private readonly token: string,
  ) {}

  public hasToken(): boolean {
    return this.token.length > 0;
  }

  async getMatches(kind: "running" | "upcoming" | "past", perPage = 50): Promise<PsMatch[]> {
    if (!this.token) {
      this.logger.warn("PandaScore", "PANDASCORE_TOKEN nije postavljen");
      return [];
    }
    const params = new URLSearchParams();
    params.set("per_page", String(Math.min(100, Math.max(1, perPage))));
    // Za zavrsene hocemo najskorije prvo (-begin_at), za live/upcoming rastuce.
    params.set("sort", kind === "past" ? "-begin_at" : "begin_at");
    const url = `${this.base}/matches/${kind}?${params.toString()}`;
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
      if (!r.ok) {
        this.logger.warn("PandaScore", `HTTP ${r.status} za /matches/${kind}`);
        return [];
      }
      const data: unknown = await r.json();
      return Array.isArray(data) ? (data as PsMatch[]) : [];
    } catch {
      this.logger.error("PandaScore", `fetch /matches/${kind} failed`);
      return [];
    }
  }

  // Pojedinacni mec po id-u — koristi se u pomirenju da povuce PRAVI (finalni)
  // rezultat/status meca koji je ispao iz feed-a.
  async getMatchById(externalId: string): Promise<PsMatch | null> {
    if (!this.token) return null;
    const url = `${this.base}/matches/${encodeURIComponent(externalId)}`;
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
      if (!r.ok) {
        this.logger.warn("PandaScore", `HTTP ${r.status} za /matches/${externalId}`);
        return null;
      }
      const data: unknown = await r.json();
      return data && typeof data === "object" && !Array.isArray(data) ? (data as PsMatch) : null;
    } catch {
      this.logger.error("PandaScore", `fetch /matches/${externalId} failed`);
      return null;
    }
  }

  // Genericki GET koji vraca niz (za strukturu/brackets/standings).
  private async getArray<T>(path: string): Promise<T[]> {
    if (!this.token) {
      this.logger.warn("PandaScore", "PANDASCORE_TOKEN nije postavljen");
      return [];
    }
    try {
      const r = await fetch(`${this.base}${path}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
      if (!r.ok) {
        this.logger.warn("PandaScore", `HTTP ${r.status} za ${path}`);
        return [];
      }
      const data: unknown = await r.json();
      return Array.isArray(data) ? (data as T[]) : [];
    } catch {
      this.logger.error("PandaScore", `fetch ${path} failed`);
      return [];
    }
  }

  getLeaguesByGame(gameSlug: string): Promise<PsLeague[]> {
    return this.getArray<PsLeague>(`/videogames/${encodeURIComponent(gameSlug)}/leagues?per_page=100`);
  }

  getSeriesByLeague(leagueId: string): Promise<PsSerie[]> {
    return this.getArray<PsSerie>(`/leagues/${encodeURIComponent(leagueId)}/series?per_page=100&sort=-year`);
  }

  getTournamentsBySerie(serieId: string): Promise<PsTournament[]> {
    return this.getArray<PsTournament>(`/series/${encodeURIComponent(serieId)}/tournaments?per_page=100`);
  }

  getTournaments(kind: "running" | "upcoming" | "past"): Promise<PsTournament[]> {
    return this.getArray<PsTournament>(`/tournaments/${kind}?per_page=100`);
  }

  getTournamentMatches(tournamentId: string): Promise<PsMatch[]> {
    return this.getArray<PsMatch>(`/tournaments/${encodeURIComponent(tournamentId)}/matches?per_page=100&sort=begin_at`);
  }

  getTournamentBrackets(tournamentId: string): Promise<PsMatch[]> {
    return this.getArray<PsMatch>(`/tournaments/${encodeURIComponent(tournamentId)}/brackets?per_page=100`);
  }

  getTournamentStandings(tournamentId: string): Promise<PsStandingRow[]> {
    return this.getArray<PsStandingRow>(`/tournaments/${encodeURIComponent(tournamentId)}/standings`);
  }

  async getTournamentById(tournamentId: string): Promise<PsTournament | null> {
    if (!this.token) return null;
    try {
      const r = await fetch(`${this.base}/tournaments/${encodeURIComponent(tournamentId)}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
      if (!r.ok) {
        this.logger.warn("PandaScore", `HTTP ${r.status} za /tournaments/${tournamentId}`);
        return null;
      }
      const data: unknown = await r.json();
      return data && typeof data === "object" && !Array.isArray(data) ? (data as PsTournament) : null;
    } catch {
      this.logger.error("PandaScore", `fetch /tournaments/${tournamentId} failed`);
      return null;
    }
  }
}
