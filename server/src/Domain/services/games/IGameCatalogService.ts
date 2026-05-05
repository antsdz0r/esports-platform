import { GameCatalogDto } from "../../DTOs/games/GameCatalogDto";

export interface IGameCatalogService {
  getAll(): Promise<GameCatalogDto[]>;
  getById(gameId: number): Promise<GameCatalogDto | null>;
  create(payload: {
    name: string;
    tag: string;
    genre: string;
    maxPlayers: number;
  }): Promise<GameCatalogDto | null>;
  update(
    gameId: number,
    payload: {
      name: string;
      tag: string;
      genre: string;
      maxPlayers: number;
    }
  ): Promise<boolean>;
  delete(gameId: number): Promise<boolean>;
}
