import { IBadgeService } from "../../Domain/services/pickem/IBadgeService";
import { IPickemStatsRepository } from "../../Domain/repositories/pickem/IPickemStatsRepository";
import { IPredictionRepository } from "../../Domain/repositories/pickem/IPredictionRepository";
import { IUserBadgeRepository } from "../../Domain/repositories/pickem/IUserBadgeRepository";
import { BADGE_DEFS, BadgeSnapshot } from "../../Domain/constants/BadgeDefinitions";

export class BadgeService implements IBadgeService {
  public constructor(
    private readonly statsRepo: IPickemStatsRepository,
    private readonly predictionRepo: IPredictionRepository,
    private readonly badgeRepo: IUserBadgeRepository,
  ) {}

  async evaluateForUser(userId: number): Promise<string[]> {
    const stats = await this.statsRepo.getForUser(userId);
    const predictionsMade = await this.predictionRepo.countForUser(userId);

    const snapshot: BadgeSnapshot = {
      predictionsMade,
      totalPredictions: stats.totalPredictions,
      correctPredictions: stats.correctPredictions,
      totalPoints: stats.totalPoints,
      bestStreak: stats.bestStreak,
      currentStreak: stats.currentStreak,
    };

    const owned = new Set(await this.badgeRepo.listCodesForUser(userId));
    const newly: string[] = [];
    for (const def of BADGE_DEFS) {
      if (owned.has(def.code)) continue;
      if (def.test(snapshot)) {
        const awarded = await this.badgeRepo.award(userId, def.code);
        if (awarded) newly.push(def.code);
      }
    }
    return newly;
  }
}
