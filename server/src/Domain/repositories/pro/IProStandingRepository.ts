import { ProStanding } from "../../models/ProStanding";

export interface IProStandingRepository {
  replaceForTournament(tournamentExternalId: string, rows: ProStanding[]): Promise<void>;
  findByTournament(tournamentExternalId: string): Promise<ProStanding[]>;
}
