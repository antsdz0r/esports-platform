import { GameCatalogDto } from "../../Domain/DTOs/games/GameCatalogDto";
import { TournamentStatus } from "../../Domain/enums/TournamentStatus";
import { GameCatalog } from "../../Domain/models/GameCatalog";
import { IGameCatalogRepository } from "../../Domain/repositories/game_catalog/IGameCatalogRepository";
import { ITournamentRepository } from "../../Domain/repositories/tournaments/ITournamentRepository";
import { IGameCatalogService } from "../../Domain/services/games/IGameCatalogService";

export class GameCatalogService implements IGameCatalogService {
  public constructor(
    private readonly gameRepo: IGameCatalogRepository,
    private readonly tournamentRepo: ITournamentRepository,
  ) {}

  private async toDto(game: GameCatalog): Promise<GameCatalogDto> {
    const tournaments = await this.tournamentRepo.findByGameId(game.gameId);
    const activeTournamentsCount = tournaments.filter(
      (t) => t.status !== TournamentStatus.COMPLETED
    ).length;

    return new GameCatalogDto(
      game.gameId,
      game.name,
      game.tag,
      game.genre,
      game.maxPlayers,
      activeTournamentsCount
    );
  }

  async getAll(): Promise<GameCatalogDto[]> {
    const games = await this.gameRepo.findAll();
    return Promise.all(games.map((game) => this.toDto(game)));
  }

  async getById(gameId: number): Promise<GameCatalogDto | null> {
    const game = await this.gameRepo.findById(gameId);
    if (game.gameId === 0) return null;
    return this.toDto(game);
  }

  async create(payload: {
    name: string;
    tag: string;
    genre: string;
    maxPlayers: number;
  }): Promise<GameCatalogDto | null> {
    const byName = await this.gameRepo.findByName(payload.name);
    if (byName.gameId !== 0) return null;

    const byTag = await this.gameRepo.findByTag(payload.tag);
    if (byTag.gameId !== 0) return null;

    const created = await this.gameRepo.create(
      new GameCatalog(
        0,
        payload.name,
        payload.tag,
        payload.genre,
        payload.maxPlayers,
      )
    );

    if (created.gameId === 0) return null;
    return this.toDto(created);
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
