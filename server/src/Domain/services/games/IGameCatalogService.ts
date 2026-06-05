import { GameCatalog } from "../../models/GameCatalog";

export interface IGameCatalogService {
  getAll(): Promise<GameCatalog[]>;
  getById(gameId: number): Promise<GameCatalog>;
  create(payload: {
    name: string;
    tag: string;
    genre: string;
    maxPlayers: number;
    imageUrl?: string | null;
  }): Promise<{ ok: boolean; game?: GameCatalog; error?: string }>;
  update(
    gameId: number,
    payload: {
      name: string;
      tag: string;
      genre: string;
      maxPlayers: number;
      imageUrl?: string | null;
    }
  ): Promise<boolean>;
  delete(gameId: number): Promise<boolean>;
}
