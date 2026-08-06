import { IProMatchWatchlistService } from "../../Domain/services/pro/IProMatchWatchlistService";
import { IProMatchWatchlistRepository } from "../../Domain/repositories/pro/IProMatchWatchlistRepository";

export class ProMatchWatchlistService implements IProMatchWatchlistService {
  public constructor(
    private readonly repo: IProMatchWatchlistRepository,
  ) {}

  add(userId: number, proMatchId: number): Promise<boolean> {
    return this.repo.add(userId, proMatchId);
  }

  remove(userId: number, proMatchId: number): Promise<void> {
    return this.repo.remove(userId, proMatchId);
  }

  listIds(userId: number): Promise<number[]> {
    return this.repo.listIds(userId);
  }
}
