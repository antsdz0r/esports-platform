import { MatchStream } from "../../models/MatchStream";

export interface IMatchStreamRepository {
  create(stream: MatchStream): Promise<MatchStream>;

  findById(streamId: number): Promise<MatchStream>;
  findByGameId(gameId: number): Promise<MatchStream[]>;
  findActiveByGameId(gameId: number): Promise<MatchStream[]>;

  update(streamId: number, stream: MatchStream): Promise<boolean>;
  delete(streamId: number): Promise<boolean>;
}
