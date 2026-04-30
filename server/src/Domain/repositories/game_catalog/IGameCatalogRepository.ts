import { GameCatalog } from "../../models/GameCatalog";

export interface IGameCatalogRepository {
  create(game: GameCatalog): Promise<GameCatalog>;

  findById(gameId: number): Promise<GameCatalog>;
  findByName(name: string): Promise<GameCatalog>;
  findByTag(tag: string): Promise<GameCatalog>;
  findAll(): Promise<GameCatalog[]>;

  update(game: GameCatalog): Promise<boolean>;
  delete(gameId: number): Promise<boolean>;
  exists(gameId: number): Promise<boolean>;
}