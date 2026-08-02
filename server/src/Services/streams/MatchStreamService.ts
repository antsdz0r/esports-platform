import { MatchStream } from "../../Domain/models/MatchStream";
import { IMatchStreamRepository } from "../../Domain/repositories/streams/IMatchStreamRepository";
import { IGameRepository } from "../../Domain/repositories/games/IGameRepository";
import { IMatchStreamService } from "../../Domain/services/streams/IMatchStreamService";
import { CreateStreamData } from "../../Domain/models/CreateStreamData";
import { UpdateStreamData } from "../../Domain/models/UpdateStreamData";

export class MatchStreamService implements IMatchStreamService {
  public constructor(
    private readonly streamRepo: IMatchStreamRepository,
    private readonly gameRepo: IGameRepository,
  ) {}

  async getForMatch(gameId: number): Promise<MatchStream[]> {
    return this.streamRepo.findActiveByGameId(gameId);
  }

  async getAllForMatch(gameId: number): Promise<MatchStream[]> {
    return this.streamRepo.findByGameId(gameId);
  }

  async create(data: CreateStreamData): Promise<{ ok: boolean; stream?: MatchStream; error?: string }> {
    const matchExists = await this.gameRepo.exists(data.gameId);
    if (!matchExists) return { ok: false, error: "Match does not exist" };

    const created = await this.streamRepo.create(
      new MatchStream(0, data.gameId, data.platform, data.channel, data.type, data.language, data.title ?? null, true)
    );
    if (created.streamId === 0) return { ok: false, error: "Failed to create stream" };

    return { ok: true, stream: created };
  }

  async update(streamId: number, data: UpdateStreamData): Promise<boolean> {
    const existing = await this.streamRepo.findById(streamId);
    if (existing.streamId === 0) return false;

    return this.streamRepo.update(
      streamId,
      new MatchStream(streamId, existing.gameId, data.platform, data.channel, data.type, data.language, data.title ?? null, data.isActive)
    );
  }

  async delete(streamId: number): Promise<boolean> {
    const existing = await this.streamRepo.findById(streamId);
    if (existing.streamId === 0) return false;
    return this.streamRepo.delete(streamId);
  }
}
