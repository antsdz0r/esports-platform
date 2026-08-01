import { ProTournamentListDto } from "../../DTOs/pro/ProStructureDtos";

export interface IProFavoriteService {
  listFavorites(userId: number): Promise<ProTournamentListDto[]>;
  listIds(userId: number): Promise<string[]>;
  add(userId: number, tournamentExternalId: string): Promise<void>;
  remove(userId: number, tournamentExternalId: string): Promise<void>;
}
