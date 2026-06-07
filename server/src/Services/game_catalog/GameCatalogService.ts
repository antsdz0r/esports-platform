import { GameCatalog } from "../../Domain/models/GameCatalog";
import { IGameCatalogRepository } from "../../Domain/repositories/game_catalog/IGameCatalogRepository";
import { ITournamentRepository } from "../../Domain/repositories/tournaments/ITournamentRepository";
import { IGameCatalogService } from "../../Domain/services/games/IGameCatalogService";
import { CreateGameData } from "../../Domain/models/CreateGameData";
import { UpdateGameData } from "../../Domain/models/UpdateGameData";

export class GameCatalogService implements IGameCatalogService {
  public constructor(
    private readonly gameRepo: IGameCatalogRepository,
    private readonly tournamentRepo: ITournamentRepository,
  ) {}

  async getAll(): Promise<GameCatalog[]> {
    return this.gameRepo.findAll();
  }

  async getById(gameId: number): Promise<GameCatalog> {
    return this.gameRepo.findById(gameId);
  }

  async create(data: CreateGameData): Promise<{ ok: boolean; game?: GameCatalog; error?: string }> {
    const byName = await this.gameRepo.findByName(data.name);
    if (byName.gameId !== 0) return { ok: false, error: "Igra sa tim imenom vec postoji" };

    const byTag = await this.gameRepo.findByTag(data.tag);
    if (byTag.gameId !== 0) return { ok: false, error: "Igra sa tim tagom vec postoji" };

    const created = await this.gameRepo.create(
      new GameCatalog(0, data.name, data.tag, data.genre, data.maxPlayers, data.imageUrl ?? null)
    );
    if (created.gameId === 0) return { ok: false, error: "Greska pri kreiranju igre" };

    return { ok: true, game: created };
  }

  async update(gameId: number, data: UpdateGameData): Promise<boolean> {
    const existing = await this.gameRepo.findById(gameId);
    if (existing.gameId === 0) return false;

    const byName = await this.gameRepo.findByName(data.name);
    if (byName.gameId !== 0 && byName.gameId !== gameId) return false;

    const byTag = await this.gameRepo.findByTag(data.tag);
    if (byTag.gameId !== 0 && byTag.gameId !== gameId) return false;

    return this.gameRepo.update(
      new GameCatalog(gameId, data.name, data.tag, data.genre, data.maxPlayers, data.imageUrl ?? null)
    );
  }

  async delete(gameId: number): Promise<boolean> {
    const tournaments = await this.tournamentRepo.findByGameId(gameId);
    if (tournaments.length > 0) return false;
    return this.gameRepo.delete(gameId);
  }
}
