export interface IWatchlistRepository {
  add(userId: number, tournamentId: number): Promise<boolean>;
  remove(userId: number, tournamentId: number): Promise<boolean>;
  exists(userId: number, tournamentId: number): Promise<boolean>;
  getByUser(userId: number): Promise<number[]>;
}