import type { MatchStream, StreamInput } from "../../models/stream/StreamTypes";

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export interface IStreamAPIService {
  getForMatch(gameId: number): Promise<ApiResponse<MatchStream[]>>;
  getAllForMatch(gameId: number): Promise<ApiResponse<MatchStream[]>>;
  create(gameId: number, input: StreamInput): Promise<ApiResponse<MatchStream>>;
  update(streamId: number, input: StreamInput): Promise<ApiResponse<null>>;
  remove(streamId: number): Promise<ApiResponse<null>>;
}
