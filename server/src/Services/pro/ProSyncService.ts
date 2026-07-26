import { IProSyncService } from "../../Domain/services/pro/IProSyncService";
import { IProMatchRepository } from "../../Domain/repositories/pro/IProMatchRepository";
import { IProStreamRepository } from "../../Domain/repositories/pro/IProStreamRepository";
import { ILoggerService } from "../../Domain/services/logger/ILoggerService";
import { ProMatch } from "../../Domain/models/ProMatch";
import { ProStream } from "../../Domain/models/ProStream";
import { ProMatchStatus } from "../../Domain/enums/ProMatchStatus";
import { PandaScoreClient, PsMatch } from "./PandaScoreClient";
import { parseStreamUrl } from "./parseStreamUrl";

const SOURCE = "pandascore";

export class ProSyncService implements IProSyncService {
  public constructor(
    private readonly client: PandaScoreClient,
    private readonly matchRepo: IProMatchRepository,
    private readonly streamRepo: IProStreamRepository,
    private readonly logger: ILoggerService,
  ) {}

  private mapStatus(raw: string | null | undefined): ProMatchStatus {
    switch (raw) {
      case "running": return ProMatchStatus.LIVE;
      case "finished": return ProMatchStatus.FINISHED;
      case "canceled": return ProMatchStatus.CANCELED;
      default: return ProMatchStatus.UPCOMING;
    }
  }

  private toModel(m: PsMatch): ProMatch | null {
    if (!m.id) return null;

    const opponents = (m.opponents ?? []).map((o) => o.opponent).filter((o): o is NonNullable<typeof o> => !!o);
    const t1 = opponents[0];
    const t2 = opponents[1];

    const results = m.results ?? [];
    const scoreOf = (teamId?: number): number =>
      teamId == null ? 0 : (results.find((r) => r.team_id === teamId)?.score ?? 0);

    const scheduled = m.begin_at ?? m.scheduled_at ?? null;

    return new ProMatch(
      0,
      String(m.id),
      m.videogame?.slug ?? "",
      m.league?.name ?? null,
      m.serie?.full_name ?? m.serie?.name ?? null,
      m.tournament?.name ?? null,
      m.name ?? null,
      t1?.name ?? null,
      t1?.image_url ?? null,
      t2?.name ?? null,
      t2?.image_url ?? null,
      scoreOf(t1?.id),
      scoreOf(t2?.id),
      m.number_of_games ?? null,
      this.mapStatus(m.status),
      scheduled ? new Date(scheduled) : null,
    );
  }

  private toStreams(proMatchId: number, m: PsMatch): ProStream[] {
    const list = m.streams_list ?? [];
    const seen = new Set<string>();
    const out: ProStream[] = [];
    for (const s of list) {
      const url = s.raw_url ?? s.embed_url ?? null;
      if (!url) continue;
      const parsed = parseStreamUrl(url);
      if (!parsed) continue;
      const key = `${parsed.platform}:${parsed.channel.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lang = (s.language ?? "en").slice(0, 10);
      out.push(new ProStream(0, proMatchId, parsed.platform, parsed.channel, lang, s.official ?? true));
    }
    return out;
  }

  async sync(gameSlug?: string): Promise<{ ok: boolean; synced: number; error?: string }> {
    if (!this.client.hasToken()) {
      return { ok: false, synced: 0, error: "PANDASCORE_TOKEN nije postavljen na serveru" };
    }

    const [running, upcoming, past] = await Promise.all([
      this.client.getMatches("running", 50),
      this.client.getMatches("upcoming", 50),
      this.client.getMatches("past", 50),
    ]);

    let raw = [...running, ...upcoming, ...past];
    if (gameSlug) raw = raw.filter((m) => m.videogame?.slug === gameSlug);

    if (raw.length === 0) {
      return { ok: false, synced: 0, error: "Nema podataka sa izvora (proveri token ili filter igre)" };
    }

    let synced = 0;
    for (const m of raw) {
      const model = this.toModel(m);
      if (!model) continue;
      const proMatchId = await this.matchRepo.upsert(model);
      if (proMatchId === 0) continue;
      await this.streamRepo.replaceForMatch(proMatchId, SOURCE, this.toStreams(proMatchId, m));
      synced++;
    }

    this.logger.info("ProSync", `Sinhronizovano ${synced} pro meceva${gameSlug ? ` (${gameSlug})` : ""}`);
    return { ok: true, synced };
  }
}
