export interface IProMatchWatchlistRepository {
  add(userId: number, proMatchId: number): Promise<boolean>;
  remove(userId: number, proMatchId: number): Promise<void>;
  listIds(userId: number): Promise<number[]>;
}
