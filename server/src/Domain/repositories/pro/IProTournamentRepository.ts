import { ProTournament } from "../../models/ProTournament";

export interface IProTournamentRepository {
  upsert(tournament: ProTournament): Promise<void>;
  findBySerie(serieExternalId: string): Promise<ProTournament[]>;
  findByExternalId(externalId: string): Promise<ProTournament | null>;
  findActiveByGame(gameSlug: string): Promise<ProTournament[]>;
  findDistinctGames(): Promise<string[]>;
}
