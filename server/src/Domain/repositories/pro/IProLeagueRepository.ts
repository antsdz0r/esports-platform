import { ProLeague } from "../../models/ProLeague";

export interface IProLeagueRepository {
  upsert(league: ProLeague): Promise<void>;
  findByGame(gameSlug: string): Promise<ProLeague[]>;
}
