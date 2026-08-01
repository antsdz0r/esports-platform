import { IProFavoriteService } from "../../Domain/services/pro/IProFavoriteService";
import { IProFavoriteRepository } from "../../Domain/repositories/pro/IProFavoriteRepository";
import { ProTournamentListDto } from "../../Domain/DTOs/pro/ProStructureDtos";

export class ProFavoriteService implements IProFavoriteService {
  public constructor(
    private readonly repo: IProFavoriteRepository,
  ) {}

  async listFavorites(userId: number): Promise<ProTournamentListDto[]> {
    const rows = await this.repo.listForUser(userId);
    return rows.map((r) => new ProTournamentListDto(
      r.externalId, r.name, r.gameSlug, r.tier, r.hasBracket, r.status,
      r.beginAt ? r.beginAt.toISOString() : null,
      r.endAt ? r.endAt.toISOString() : null,
      r.leagueName, null, r.leagueImageUrl,
    ));
  }

  listIds(userId: number): Promise<string[]> {
    return this.repo.listIds(userId);
  }

  add(userId: number, tournamentExternalId: string): Promise<void> {
    return this.repo.add(userId, tournamentExternalId);
  }

  remove(userId: number, tournamentExternalId: string): Promise<void> {
    return this.repo.remove(userId, tournamentExternalId);
  }
}
