import { IPickemService, PickemActionResult } from "../../Domain/services/pickem/IPickemService";
import { IProMatchRepository } from "../../Domain/repositories/pro/IProMatchRepository";
import { IPredictionRepository } from "../../Domain/repositories/pickem/IPredictionRepository";
import { IPickemStatsRepository } from "../../Domain/repositories/pickem/IPickemStatsRepository";
import { IUserBadgeRepository } from "../../Domain/repositories/pickem/IUserBadgeRepository";
import { IBadgeService } from "../../Domain/services/pickem/IBadgeService";
import { ILoggerService } from "../../Domain/services/logger/ILoggerService";
import { LeaderboardRow } from "../../Domain/repositories/pickem/IPickemStatsRepository";
import { PickemStats } from "../../Domain/models/PickemStats";
import { ProMatchStatus } from "../../Domain/enums/ProMatchStatus";
import {
  PickemMatchDto, LeaderboardDto, LeaderboardEntryDto,
  PickemSummaryDto, PickemStatsDto, BadgeDto,
} from "../../Domain/DTOs/pickem/PickemDtos";
import { BADGE_DEFS } from "../../Domain/constants/BadgeDefinitions";

// Bodovanje: tačan tip = 10 + bonus za niz (svaki uzastopni pogodak +2, do +10).
const BASE_POINTS = 10;
function pointsFor(streakAfterHit: number): number {
  const bonus = Math.min(Math.max(streakAfterHit - 1, 0), 5) * 2;
  return BASE_POINTS + bonus;
}

function accuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export class PickemService implements IPickemService {
  private settling = false;

  public constructor(
    private readonly matchRepo: IProMatchRepository,
    private readonly predictionRepo: IPredictionRepository,
    private readonly statsRepo: IPickemStatsRepository,
    private readonly badgeRepo: IUserBadgeRepository,
    private readonly badgeService: IBadgeService,
    private readonly logger: ILoggerService,
  ) {}

  // Tipovanje je otvoreno samo dok je meč 'upcoming' i početak je u budućnosti.
  private isLocked(status: string, scheduledAt: Date | null): boolean {
    if (status !== ProMatchStatus.UPCOMING) return true;
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) return true;
    return false;
  }

  async getMatches(userId: number, limit: number): Promise<PickemMatchDto[]> {
    const matches = await this.matchRepo.findFeed(limit);
    if (matches.length === 0) return [];

    const ids = matches.map((m) => m.id);
    const [votes, mine] = await Promise.all([
      this.predictionRepo.countVotesByMatch(ids),
      this.predictionRepo.findByUserAndMatches(userId, ids),
    ]);
    const voteMap = new Map(votes.map((v) => [v.proMatchId, v]));
    const mineMap = new Map(mine.map((p) => [p.proMatchId, p]));

    return matches.map((m) => {
      const v = voteMap.get(m.id);
      const p = mineMap.get(m.id);
      return new PickemMatchDto(
        m.id, m.gameSlug, m.leagueName, m.tournamentName, m.stage,
        m.team1Name, m.team1Logo, m.team2Name, m.team2Logo,
        m.team1Score, m.team2Score, m.bestOf, m.status,
        m.scheduledAt ? m.scheduledAt.toISOString() : null,
        this.isLocked(m.status, m.scheduledAt),
        p ? p.predictedSide : null,
        p ? p.isCorrect : null,
        p ? p.pointsAwarded : 0,
        v?.side1 ?? 0, v?.side2 ?? 0,
      );
    });
  }

  async getMyPredictions(userId: number, limit: number): Promise<PickemMatchDto[]> {
    const rows = await this.predictionRepo.findHistoryForUser(userId, limit);
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.matchId);
    const votes = await this.predictionRepo.countVotesByMatch(ids);
    const voteMap = new Map(votes.map((v) => [v.proMatchId, v]));

    return rows.map((r) => {
      const v = voteMap.get(r.matchId);
      return new PickemMatchDto(
        r.matchId, r.gameSlug, r.leagueName, r.tournamentName, r.stage,
        r.team1Name, r.team1Logo, r.team2Name, r.team2Logo,
        r.team1Score, r.team2Score, r.bestOf, r.status,
        r.scheduledAt ? r.scheduledAt.toISOString() : null,
        this.isLocked(r.status, r.scheduledAt),
        r.predictedSide, r.isCorrect, r.pointsAwarded,
        v?.side1 ?? 0, v?.side2 ?? 0,
      );
    });
  }

  async predict(userId: number, matchId: number, side: number): Promise<PickemActionResult> {
    if (side !== 1 && side !== 2) return { ok: false, message: "Choose team 1 or team 2" };
    const match = await this.matchRepo.findById(matchId);
    if (!match) return { ok: false, message: "Match not found" };
    if (this.isLocked(match.status, match.scheduledAt)) return { ok: false, message: "Predictions are closed for this match" };
    if (!match.team1Name || !match.team2Name) return { ok: false, message: "Teams for this match aren't known yet" };

    await this.predictionRepo.upsert(userId, matchId, side);
    // Bedževi vezani za sam čin tipovanja (npr. „Debitant").
    await this.badgeService.evaluateForUser(userId);
    return { ok: true };
  }

  async removePrediction(userId: number, matchId: number): Promise<PickemActionResult> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return { ok: false, message: "Match not found" };
    if (this.isLocked(match.status, match.scheduledAt)) return { ok: false, message: "The pick can't be removed — the match has started" };
    await this.predictionRepo.remove(userId, matchId);
    return { ok: true };
  }

  private toEntry(row: LeaderboardRow, rank: number): LeaderboardEntryDto {
    return new LeaderboardEntryDto(
      rank, row.userId, row.gamerTag, row.profilePicture,
      row.totalPoints, row.correctPredictions, row.totalPredictions,
      accuracy(row.correctPredictions, row.totalPredictions),
      row.bestStreak, row.currentStreak, row.badgeCount,
    );
  }

  async getLeaderboard(userId: number, limit: number): Promise<LeaderboardDto> {
    const rows = await this.statsRepo.leaderboard(limit);
    const entries = rows.map((r, i) => this.toEntry(r, i + 1));

    let me = entries.find((e) => e.userId === userId) ?? null;
    if (!me) {
      const row = await this.statsRepo.getRowForUser(userId);
      if (row && row.totalPredictions > 0) {
        const rank = (await this.statsRepo.getRank(userId)) ?? entries.length + 1;
        me = this.toEntry(row, rank);
      }
    }
    return new LeaderboardDto(entries, me);
  }

  async getSummary(userId: number): Promise<PickemSummaryDto> {
    const stats = await this.statsRepo.getForUser(userId);
    const predictionsMade = await this.predictionRepo.countForUser(userId);
    const rank = await this.statsRepo.getRank(userId);

    const statsDto = new PickemStatsDto(
      stats.totalPoints, predictionsMade, stats.totalPredictions, stats.correctPredictions,
      accuracy(stats.correctPredictions, stats.totalPredictions),
      stats.currentStreak, stats.bestStreak, rank,
    );

    const owned = await this.badgeRepo.listForUser(userId);
    const ownedMap = new Map(owned.map((b) => [b.badgeCode, b.earnedAt]));
    const badges = [...BADGE_DEFS]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((def) => {
        const earnedAt = ownedMap.get(def.code);
        return new BadgeDto(
          def.code, def.name, def.description, def.icon, def.tier, def.sortOrder,
          ownedMap.has(def.code), earnedAt ? earnedAt.toISOString() : null,
        );
      });

    return new PickemSummaryDto(statsDto, badges);
  }

  async settlePending(): Promise<{ settled: number }> {
    if (this.settling) return { settled: 0 };
    this.settling = true;
    try {
      // Otkazani mečevi: void neporavnatih tipova (ne ulaze u statistiku).
      await this.predictionRepo.deleteUnsettledForCanceled();

      const rows = await this.predictionRepo.findUnsettledSettleable();
      if (rows.length === 0) return { settled: 0 };

      // Učitaj statistiku svih zahvaćenih korisnika u memoriju (streak se nastavlja od DB stanja).
      const userIds = [...new Set(rows.map((r) => r.userId))];
      const statsMap = new Map<number, PickemStats>();
      for (const uid of userIds) {
        statsMap.set(uid, await this.statsRepo.getForUser(uid));
      }

      // Obrada hronološkim redom (rows su već sortirani po vremenu meča).
      for (const row of rows) {
        const winnerSide = row.team1Score > row.team2Score ? 1 : 2;
        const correct = row.predictedSide === winnerSide;
        const stats = statsMap.get(row.userId)!;

        stats.totalPredictions += 1;
        let points = 0;
        if (correct) {
          stats.currentStreak += 1;
          points = pointsFor(stats.currentStreak);
          stats.totalPoints += points;
          stats.correctPredictions += 1;
          if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
        } else {
          stats.currentStreak = 0;
        }
        await this.predictionRepo.markSettled(row.predictionId, correct, points);
      }

      // Perzistuj statistiku i evaluiraj bedževe za svakog korisnika.
      for (const uid of userIds) {
        await this.statsRepo.upsert(statsMap.get(uid)!);
        await this.badgeService.evaluateForUser(uid);
      }

      this.logger.info("Pickem", `Poravnato ${rows.length} predikcija za ${userIds.length} korisnika`);
      return { settled: rows.length };
    } catch {
      this.logger.error("Pickem", "settlePending failed");
      return { settled: 0 };
    } finally {
      this.settling = false;
    }
  }
}
