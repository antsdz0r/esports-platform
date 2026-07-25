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

  async getMatches(kind: "running" | "upcoming", perPage = 50): Promise<PsMatch[]> {
    if (!this.token) {
      this.logger.warn("PandaScore", "PANDASCORE_TOKEN nije postavljen");
      return [];
    }
    const params = new URLSearchParams();
    params.set("per_page", String(Math.min(100, Math.max(1, perPage))));
    params.set("sort", "begin_at");
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
}
