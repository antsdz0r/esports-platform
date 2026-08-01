import { IProTournamentService } from "../../Domain/services/pro/IProTournamentService";
import { IProLeagueRepository } from "../../Domain/repositories/pro/IProLeagueRepository";
import { IProSerieRepository } from "../../Domain/repositories/pro/IProSerieRepository";
import { IProTournamentRepository } from "../../Domain/repositories/pro/IProTournamentRepository";
import { IProStandingRepository } from "../../Domain/repositories/pro/IProStandingRepository";
import { IProMatchRepository } from "../../Domain/repositories/pro/IProMatchRepository";
import { ProSerie } from "../../Domain/models/ProSerie";
import { ProTournament } from "../../Domain/models/ProTournament";
import { ProStanding } from "../../Domain/models/ProStanding";
import { ProMatch } from "../../Domain/models/ProMatch";
import { ProMatchStatus } from "../../Domain/enums/ProMatchStatus";
import { ProTournamentStatus } from "../../Domain/enums/ProTournamentStatus";
import {
  ProLeagueDto, ProSerieDto, ProTournamentListDto,
  ProTournamentMatchDto, ProStandingDto, ProTournamentDetailDto,
} from "../../Domain/DTOs/pro/ProStructureDtos";
import { PandaScoreClient, PsMatch, PsStandingRow, PsTournament } from "./PandaScoreClient";

export class ProTournamentService implements IProTournamentService {
  public constructor(
    private readonly client: PandaScoreClient,
    private readonly leagueRepo: IProLeagueRepository,
    private readonly serieRepo: IProSerieRepository,
    private readonly tournamentRepo: IProTournamentRepository,
    private readonly standingRepo: IProStandingRepository,
    private readonly matchRepo: IProMatchRepository,
  ) {}

  private matchStatus(raw: string | null | undefined): ProMatchStatus {
    switch (raw) {
      case "running": return ProMatchStatus.LIVE;
      case "finished": return ProMatchStatus.FINISHED;
      case "canceled": return ProMatchStatus.CANCELED;
      default: return ProMatchStatus.UPCOMING;
    }
  }

  private statusFromDates(begin?: string | null, end?: string | null): ProTournamentStatus {
    const now = Date.now();
    if (end && new Date(end).getTime() < now) return ProTournamentStatus.FINISHED;
    if (begin && new Date(begin).getTime() > now) return ProTournamentStatus.UPCOMING;
    return ProTournamentStatus.RUNNING;
  }

  // "Popularnost" preko PandaScore tier-a: s (najprestizniji) -> d, ostalo najniže.
  private tierRank(tier: string | null): number {
    const order: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };
    return tier ? (order[tier.toLowerCase()] ?? 5) : 5;
  }

  private toListDto(t: ProTournament, leagueName: string | null, serieName: string | null, leagueImageUrl: string | null = null): ProTournamentListDto {
    return new ProTournamentListDto(
      t.externalId, t.name, t.gameSlug, t.tier, t.hasBracket, t.status,
      t.beginAt ? t.beginAt.toISOString() : null,
      t.endAt ? t.endAt.toISOString() : null,
      leagueName, serieName, leagueImageUrl,
    );
  }

  private toMatchDto(m: ProMatch): ProTournamentMatchDto {
    return new ProTournamentMatchDto(
      m.externalId, m.round, m.position, m.status,
      m.team1Name, m.team1Logo, m.team2Name, m.team2Logo,
      m.team1Score, m.team2Score, m.bestOf,
      m.scheduledAt ? m.scheduledAt.toISOString() : null,
    );
  }

  private mapPsMatch(m: PsMatch, tournamentExternalId: string): ProMatch | null {
    if (!m.id) return null;
    const opponents = (m.opponents ?? []).map((o) => o.opponent).filter((o): o is NonNullable<typeof o> => !!o);
    const t1 = opponents[0];
    const t2 = opponents[1];
    const results = m.results ?? [];
    const scoreOf = (teamId?: number): number =>
      teamId == null ? 0 : (results.find((r) => r.team_id === teamId)?.score ?? 0);
    const scheduled = m.begin_at ?? m.scheduled_at ?? null;
    return new ProMatch(
      0, String(m.id), m.videogame?.slug ?? "",
      m.league?.name ?? null, m.serie?.full_name ?? m.serie?.name ?? null, m.tournament?.name ?? null, m.name ?? null,
      t1?.name ?? null, t1?.image_url ?? null, t2?.name ?? null, t2?.image_url ?? null,
      scoreOf(t1?.id), scoreOf(t2?.id), m.number_of_games ?? null,
      this.matchStatus(m.status), scheduled ? new Date(scheduled) : null,
      tournamentExternalId, null, m.position ?? null,
    );
  }

  // Rundu svakog meca racunamo iz bracket grafa: mec bez prethodnih = runda 1,
  // inace runda = 1 + max(runda prethodnih meceva). Memoizovano, sa cycle-guardom.
  private computeBracketRounds(brackets: PsMatch[]): Map<number, number> {
    const byId = new Map<number, PsMatch>();
    for (const m of brackets) if (m.id) byId.set(m.id, m);
    const memo = new Map<number, number>();
    const roundOf = (id: number, stack: Set<number>): number => {
      const cached = memo.get(id);
      if (cached != null) return cached;
      if (stack.has(id)) return 1;
      stack.add(id);
      const m = byId.get(id);
      const prev = (m?.previous_matches ?? [])
        .map((p) => p.match_id)
        .filter((x): x is number => x != null && byId.has(x));
      const r = prev.length === 0 ? 1 : 1 + Math.max(...prev.map((p) => roundOf(p, stack)));
      stack.delete(id);
      memo.set(id, r);
      return r;
    };
    for (const m of brackets) if (m.id) roundOf(m.id, new Set());
    return memo;
  }

  private mapPsStanding(row: PsStandingRow, tournamentExternalId: string): ProStanding | null {
    const name = row.team?.name ?? row.team?.acronym ?? null;
    if (!name) return null;
    return new ProStanding(
      0, tournamentExternalId,
      row.rank ?? row.last_position ?? null, name, row.team?.image_url ?? null,
      row.wins ?? 0, row.losses ?? 0, row.ties ?? 0,
    );
  }

  async getGames(): Promise<string[]> {
    return this.tournamentRepo.findDistinctGames();
  }

  async getLeagues(gameSlug: string): Promise<ProLeagueDto[]> {
    const leagues = await this.leagueRepo.findByGame(gameSlug);
    const allT = await this.tournamentRepo.findByGame(gameSlug);

    const activeLeagueIds = new Set(
      allT.filter((t) => t.status === ProTournamentStatus.RUNNING).map((t) => t.leagueExternalId).filter((x): x is string => !!x)
    );
    const bestTier = new Map<string, number>();
    for (const t of allT) {
      if (!t.leagueExternalId) continue;
      const r = this.tierRank(t.tier);
      const cur = bestTier.get(t.leagueExternalId);
      if (cur == null || r < cur) bestTier.set(t.leagueExternalId, r);
    }

    const dtos = leagues.map((l) => new ProLeagueDto(l.externalId, l.name, l.slug, l.imageUrl, activeLeagueIds.has(l.externalId)));
    // Popularnost: aktivne prvo, pa po najboljem tier-u, pa po nazivu.
    dtos.sort((a, b) => {
      if (a.hasActive !== b.hasActive) return a.hasActive ? -1 : 1;
      const ra = bestTier.get(a.externalId) ?? 9;
      const rb = bestTier.get(b.externalId) ?? 9;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    return dtos;
  }

  async getActiveTournaments(gameSlug: string): Promise<ProTournamentListDto[]> {
    const active = await this.tournamentRepo.findActiveByGame(gameSlug);
    active.sort((a, b) =>
      this.tierRank(a.tier) - this.tierRank(b.tier) ||
      (a.beginAt?.getTime() ?? 0) - (b.beginAt?.getTime() ?? 0)
    );
    const leagues = await this.leagueRepo.findByGame(gameSlug);
    const leagueName = new Map(leagues.map((l) => [l.externalId, l.name]));
    const leagueImage = new Map(leagues.map((l) => [l.externalId, l.imageUrl]));
    return active.map((t) => this.toListDto(
      t,
      t.leagueExternalId ? (leagueName.get(t.leagueExternalId) ?? null) : null,
      null,
      t.leagueExternalId ? (leagueImage.get(t.leagueExternalId) ?? null) : null,
    ));
  }

  async getSeries(leagueExternalId: string): Promise<ProSerieDto[]> {
    let series = await this.serieRepo.findByLeague(leagueExternalId);
    if (series.length === 0) {
      const ps = await this.client.getSeriesByLeague(leagueExternalId);
      for (const s of ps) {
        if (!s.id) continue;
        await this.serieRepo.upsert(new ProSerie(
          0, String(s.id), leagueExternalId, s.videogame?.slug ?? "",
          s.full_name ?? s.name ?? "", s.name ?? null, s.year ?? null,
          s.begin_at ? new Date(s.begin_at) : null, s.end_at ? new Date(s.end_at) : null,
        ));
      }
      series = await this.serieRepo.findByLeague(leagueExternalId);
    }
    const out: ProSerieDto[] = [];
    for (const s of series) {
      const tours = await this.tournamentRepo.findBySerie(s.externalId);
      out.push(new ProSerieDto(s.externalId, s.fullName, s.name, s.year, tours.length));
    }
    return out;
  }

  async getTournaments(serieExternalId: string): Promise<ProTournamentListDto[]> {
    let tours = await this.tournamentRepo.findBySerie(serieExternalId);
    if (tours.length === 0) {
      const ps = await this.client.getTournamentsBySerie(serieExternalId);
      for (const t of ps) {
        if (!t.id) continue;
        const leagueId = t.league?.id != null ? String(t.league.id) : (t.league_id != null ? String(t.league_id) : null);
        await this.tournamentRepo.upsert(new ProTournament(
          0, String(t.id), serieExternalId, leagueId, t.videogame?.slug ?? "",
          t.name ?? "", t.slug ?? null, t.tier ?? null, t.has_bracket ?? false, t.prizepool ?? null,
          this.statusFromDates(t.begin_at, t.end_at),
          t.begin_at ? new Date(t.begin_at) : null, t.end_at ? new Date(t.end_at) : null,
        ));
      }
      tours = await this.tournamentRepo.findBySerie(serieExternalId);
    }
    const serie = await this.serieRepo.findByExternalId(serieExternalId);
    return tours.map((t) => this.toListDto(t, null, serie?.fullName ?? null));
  }

  async getTournamentDetail(externalId: string): Promise<ProTournamentDetailDto | null> {
    let t = await this.tournamentRepo.findByExternalId(externalId);
    if (!t) {
      const ps: PsTournament | null = await this.client.getTournamentById(externalId);
      if (!ps) return null;
      const leagueId = ps.league?.id != null ? String(ps.league.id) : (ps.league_id != null ? String(ps.league_id) : null);
      const serieId = ps.serie?.id != null ? String(ps.serie.id) : (ps.serie_id != null ? String(ps.serie_id) : null);
      await this.tournamentRepo.upsert(new ProTournament(
        0, String(ps.id), serieId, leagueId, ps.videogame?.slug ?? "",
        ps.name ?? "", ps.slug ?? null, ps.tier ?? null, ps.has_bracket ?? false, ps.prizepool ?? null,
        this.statusFromDates(ps.begin_at, ps.end_at),
        ps.begin_at ? new Date(ps.begin_at) : null, ps.end_at ? new Date(ps.end_at) : null,
      ));
      t = await this.tournamentRepo.findByExternalId(externalId);
    }
    if (!t) return null;

    // Mecevi — sveze sa izvora, upsert (linkovani na turnir), pa citanje iz baze.
    const psMatches = await this.client.getTournamentMatches(externalId);
    for (const pm of psMatches) {
      const model = this.mapPsMatch(pm, externalId);
      if (model) await this.matchRepo.upsert(model);
    }

    // Bracket: izvuci pravu strukturu (rundu po dubini iz previous_matches) i upsertuj round/position.
    if (t.hasBracket) {
      const brackets = await this.client.getTournamentBrackets(externalId);
      const rounds = this.computeBracketRounds(brackets);
      const posCounter = new Map<number, number>();
      for (const bm of brackets) {
        if (!bm.id) continue;
        const model = this.mapPsMatch(bm, externalId);
        if (!model) continue;
        const r = rounds.get(bm.id) ?? null;
        model.round = r;
        if (r != null) {
          const p = posCounter.get(r) ?? 0;
          model.position = p;
          posCounter.set(r, p + 1);
        }
        await this.matchRepo.upsert(model);
      }
    }

    const matches = await this.matchRepo.findByTournament(externalId);

    // Standings — sveze sa izvora, kesiranje, pa citanje.
    const psStand = await this.client.getTournamentStandings(externalId);
    const rows = psStand.map((s) => this.mapPsStanding(s, externalId)).filter((s): s is ProStanding => s !== null);
    if (rows.length > 0) await this.standingRepo.replaceForTournament(externalId, rows);
    const standings = await this.standingRepo.findByTournament(externalId);

    return new ProTournamentDetailDto(
      t.externalId, t.name, t.gameSlug, t.tier, t.hasBracket, t.status,
      t.beginAt ? t.beginAt.toISOString() : null,
      t.endAt ? t.endAt.toISOString() : null,
      matches.map((m) => this.toMatchDto(m)),
      standings.map((s) => new ProStandingDto(s.rank, s.teamName, s.teamLogo, s.wins, s.losses, s.ties)),
    );
  }
}
