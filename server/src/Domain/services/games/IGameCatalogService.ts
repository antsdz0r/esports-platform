import { GameCatalog } from "../../models/GameCatalog";
import { CreateGameData } from "../../models/CreateGameData";
import { UpdateGameData } from "../../models/UpdateGameData";

export interface IGameCatalogService {
  getAll(): Promise<GameCatalog[]>;
  getById(gameId: number): Promise<GameCatalog>;
  create(data: CreateGameData): Promise<{ ok: boolean; game?: GameCatalog; error?: string }>;
  update(gameId: number, data: UpdateGameData): Promise<boolean>;
  delete(gameId: number): Promise<boolean>;
}
