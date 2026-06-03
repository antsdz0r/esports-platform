

import { GameCatalog } from "../../Domain/models/GameCatalog";
import { IGameCatalogRepository } from "../../Domain/repositories/game_catalog/IGameCatalogRepository";
import { ITournamentRepository } from "../../Domain/repositories/tournaments/ITournamentRepository";
import { IGameCatalogService } from "../../Domain/services/games/IGameCatalogService";

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

  async create(payload: {
    name: string;
    tag: string;
    genre: string;
    maxPlayers: number;
    }): Promise<{ ok: boolean; game?: GameCatalog; error?: string }> {
    const byName = await this.gameRepo.findByName(payload.name);
    if (byName.gameId !== 0) return { ok: false, error: "Igra sa tim imenom već postoji" };

    const byTag = await this.gameRepo.findByTag(payload.tag);
    if (byTag.gameId !== 0) return { ok: false, error: "Igra sa tim tagom već postoji" };

    const created = await this.gameRepo.create(
      new GameCatalog(0, payload.name, payload.tag, payload.genre, payload.maxPlayers)
    );
    if (created.gameId === 0) return { ok: false, error: "Greška pri kreiranju igre" };

    return { ok: true, game: created };
  }

  async update(
    gameId: number,
    payload: {
      name: string;
      tag: string;
      genre: string;
      maxPlayers: number;
    }
  ): Promise<boolean> {
    const existing = await this.gameRepo.findById(gameId);
    if (existing.gameId === 0) return false;

    const byName = await this.gameRepo.findByName(payload.name);
    if (byName.gameId !== 0 && byName.gameId !== gameId) return false;

    const byTag = await this.gameRepo.findByTag(payload.tag);
    if (byTag.gameId !== 0 && byTag.gameId !== gameId) return false;

    return this.gameRepo.update(
      new GameCatalog(
        gameId,
        payload.name,
        payload.tag,
        payload.genre,
        payload.maxPlayers,
      )
    );
  }

  async delete(gameId: number): Promise<boolean> {
    const tournaments = await this.tournamentRepo.findByGameId(gameId);
    if (tournaments.length > 0) return false;
    return this.gameRepo.delete(gameId);
  }
}
