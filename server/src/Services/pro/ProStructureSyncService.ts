import { IProStructureSyncService } from "../../Domain/services/pro/IProStructureSyncService";
import { IProLeagueRepository } from "../../Domain/repositories/pro/IProLeagueRepository";
import { IProSerieRepository } from "../../Domain/repositories/pro/IProSerieRepository";
import { IProTournamentRepository } from "../../Domain/repositories/pro/IProTournamentRepository";
import { ILoggerService } from "../../Domain/services/logger/ILoggerService";
import { ProLeague } from "../../Domain/models/ProLeague";
import { ProSerie } from "../../Domain/models/ProSerie";
import { ProTournament } from "../../Domain/models/ProTournament";
import { ProTournamentStatus } from "../../Domain/enums/ProTournamentStatus";
import { PandaScoreClient, PsTournament } from "./PandaScoreClient";

export class ProStructureSyncService implements IProStructureSyncService {
  public constructor(
    private readonly client: PandaScoreClient,
    private readonly leagueRepo: IProLeagueRepository,
    private readonly serieRepo: IProSerieRepository,
    private readonly tournamentRepo: IProTournamentRepository,
    private readonly logger: ILoggerService,
  ) {}

  private async upsertLeague(t: PsTournament, gameSlug: string, seen: Set<string>): Promise<void> {
    const lid = t.league?.id != null ? String(t.league.id) : null;
    if (!lid || seen.has(lid)) return;
    seen.add(lid);
    await this.leagueRepo.upsert(new ProLeague(0, lid, gameSlug, t.league?.name ?? "", t.league?.slug ?? null, t.league?.image_url ?? null));
  }

  private async upsertSerie(t: PsTournament, gameSlug: string, seen: Set<string>): Promise<void> {
    const sid = t.serie?.id != null ? String(t.serie.id) : (t.serie_id != null ? String(t.serie_id) : null);
    if (!sid || seen.has(sid)) return;
    seen.add(sid);
    const leagueId = t.league?.id != null ? String(t.league.id) : (t.league_id != null ? String(t.league_id) : null);
    await this.serieRepo.upsert(new ProSerie(
      0, sid, leagueId, gameSlug,
      t.serie?.full_name ?? t.serie?.name ?? "", t.serie?.name ?? null, t.serie?.year ?? null, null, null,
    ));
  }

  private async upsertTournament(t: PsTournament, gameSlug: string, status: ProTournamentStatus): Promise<void> {
    const serieId = t.serie?.id != null ? String(t.serie.id) : (t.serie_id != null ? String(t.serie_id) : null);
    const leagueId = t.league?.id != null ? String(t.league.id) : (t.league_id != null ? String(t.league_id) : null);
    await this.tournamentRepo.upsert(new ProTournament(
      0, String(t.id), serieId, leagueId, gameSlug,
      t.name ?? "", t.slug ?? null, t.tier ?? null, t.has_bracket ?? false, t.prizepool ?? null,
      status, t.begin_at ? new Date(t.begin_at) : null, t.end_at ? new Date(t.end_at) : null,
    ));
  }

  async syncStructure(gameSlugs?: string[]): Promise<{ ok: boolean; leagues: number; series: number; tournaments: number; error?: string }> {
    const [running, upcoming, past] = await Promise.all([
      this.client.getTournaments("running"),
      this.client.getTournaments("upcoming"),
      this.client.getTournaments("past"),
    ]);

    if (running.length + upcoming.length + past.length === 0) {
      return { ok: false, leagues: 0, series: 0, tournaments: 0, error: "No data from the source (check the token)" };
    }

    const batches: [PsTournament[], ProTournamentStatus][] = [
      [running, ProTournamentStatus.RUNNING],
      [upcoming, ProTournamentStatus.UPCOMING],
      [past, ProTournamentStatus.FINISHED],
    ];

    const seenLeagues = new Set<string>();
    const seenSeries = new Set<string>();
    let tCount = 0;

    for (const [list, status] of batches) {
      for (const t of list) {
        if (!t.id) continue;
        const gameSlug = t.videogame?.slug ?? "";
        if (gameSlugs && gameSlugs.length > 0 && !gameSlugs.includes(gameSlug)) continue;

        await this.upsertLeague(t, gameSlug, seenLeagues);
        await this.upsertSerie(t, gameSlug, seenSeries);
        await this.upsertTournament(t, gameSlug, status);
        tCount++;
      }
    }

    this.logger.info("ProStructure", `Sinhronizovano: ${seenLeagues.size} liga, ${seenSeries.size} serija, ${tCount} turnira`);
    return { ok: true, leagues: seenLeagues.size, series: seenSeries.size, tournaments: tCount };
  }
}
