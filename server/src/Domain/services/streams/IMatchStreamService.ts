import { MatchStream } from "../../models/MatchStream";
import { CreateStreamData } from "../../models/CreateStreamData";
import { UpdateStreamData } from "../../models/UpdateStreamData";

export interface IMatchStreamService {
  getForMatch(gameId: number): Promise<MatchStream[]>;
  getAllForMatch(gameId: number): Promise<MatchStream[]>;
  create(data: CreateStreamData): Promise<{ ok: boolean; stream?: MatchStream; error?: string }>;
  update(streamId: number, data: UpdateStreamData): Promise<boolean>;
  delete(streamId: number): Promise<boolean>;
}
