import { IProStreamAdminService } from "../../Domain/services/pro/IProStreamAdminService";
import { IProStreamRepository } from "../../Domain/repositories/pro/IProStreamRepository";
import { IProMatchRepository } from "../../Domain/repositories/pro/IProMatchRepository";
import { ProStream } from "../../Domain/models/ProStream";
import { StreamPlatform } from "../../Domain/enums/StreamPlatform";

const LOCAL_SOURCE = "local";

export class ProStreamAdminService implements IProStreamAdminService {
  public constructor(
    private readonly streamRepo: IProStreamRepository,
    private readonly matchRepo: IProMatchRepository,
  ) {}

  async listForMatch(proMatchId: number): Promise<ProStream[]> {
    return this.streamRepo.findForMatch(proMatchId);
  }

  async addLocal(
    proMatchId: number, platform: StreamPlatform, channel: string, language: string
  ): Promise<{ ok: boolean; stream?: ProStream; error?: string }> {
    const matchExists = await this.matchRepo.exists(proMatchId);
    if (!matchExists) return { ok: false, error: "Match does not exist" };

    // Rucno dodati streamovi su kasteri/co-streamovi -> is_official = false, source = 'local'.
    const stream = new ProStream(0, proMatchId, platform, channel.trim(), language.trim(), false, LOCAL_SOURCE);
    const id = await this.streamRepo.create(stream);
    if (id === 0) return { ok: false, error: "Failed to add stream" };

    stream.id = id;
    return { ok: true, stream };
  }

  async removeLocal(streamId: number): Promise<boolean> {
    return this.streamRepo.deleteLocal(streamId);
  }
}
