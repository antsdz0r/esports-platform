import { IProMatchService } from "../../Domain/services/pro/IProMatchService";
import { IProMatchRepository } from "../../Domain/repositories/pro/IProMatchRepository";
import { IProStreamRepository } from "../../Domain/repositories/pro/IProStreamRepository";
import { ProMatchDto, ProStreamDto } from "../../Domain/DTOs/pro/ProMatchDto";

export class ProMatchService implements IProMatchService {
  public constructor(
    private readonly matchRepo: IProMatchRepository,
    private readonly streamRepo: IProStreamRepository,
  ) {}

  async getFeed(limit: number): Promise<ProMatchDto[]> {
    const matches = await this.matchRepo.findFeed(limit);
    if (matches.length === 0) return [];

    const ids = matches.map((m) => m.id);
    const streams = await this.streamRepo.findByMatchIds(ids);

    const byMatch = new Map<number, ProStreamDto[]>();
    for (const s of streams) {
      const arr = byMatch.get(s.proMatchId) ?? [];
      arr.push(new ProStreamDto(s.platform, s.channel, s.language, s.isOfficial));
      byMatch.set(s.proMatchId, arr);
    }

    return matches.map((m) => new ProMatchDto(
      m.id, m.gameSlug, m.leagueName, m.serieName, m.tournamentName, m.stage,
      m.team1Name, m.team1Logo, m.team2Name, m.team2Logo, m.team1Score, m.team2Score,
      m.bestOf, m.status, m.scheduledAt ? m.scheduledAt.toISOString() : null,
      byMatch.get(m.id) ?? [],
    ));
  }
}
