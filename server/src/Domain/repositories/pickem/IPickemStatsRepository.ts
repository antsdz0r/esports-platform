import { PickemStats } from "../../models/PickemStats";

// Red rang liste (bez ranga — rang dodeljuje servis po redosledu).
export interface LeaderboardRow {
  userId: number;
  gamerTag: string;
  profilePicture: string | null;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  bestStreak: number;
  currentStreak: number;
  badgeCount: number;
}

export interface IPickemStatsRepository {
  // Statistika korisnika (nula-red ako još nema poravnatih predikcija).
  getForUser(userId: number): Promise<PickemStats>;
  // Upsert cele statistike (posle poravnanja).
  upsert(stats: PickemStats): Promise<void>;
  // Pozicija na rang listi (null ako korisnik nema bodova).
  getRank(userId: number): Promise<number | null>;
  // Top N rang liste, sortirano po bodovima.
  leaderboard(limit: number): Promise<LeaderboardRow[]>;
  // Jedan red rang liste za konkretnog korisnika (za "me" van top N).
  getRowForUser(userId: number): Promise<LeaderboardRow | null>;
}
