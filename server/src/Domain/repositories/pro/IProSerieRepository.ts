import { ProSerie } from "../../models/ProSerie";

export interface IProSerieRepository {
  upsert(serie: ProSerie): Promise<void>;
  findByLeague(leagueExternalId: string): Promise<ProSerie[]>;
  findByExternalId(externalId: string): Promise<ProSerie | null>;
}
