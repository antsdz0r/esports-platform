import { PickemMatchDto, LeaderboardDto, PickemSummaryDto } from "../../DTOs/pickem/PickemDtos";

export interface PickemActionResult {
  ok: boolean;
  message?: string;
}

export interface IPickemService {
  // Mečevi za tipovanje (upcoming) + skoro odigrani (locked) sa mojim tipom i glasovima.
  getMatches(userId: number, limit: number): Promise<PickemMatchDto[]>;
  // Istorija mojih tipova (uklj. stare mečeve van feed prozora).
  getMyPredictions(userId: number, limit: number): Promise<PickemMatchDto[]>;
  // Postavi/izmeni tip (samo dok meč nije počeo).
  predict(userId: number, matchId: number, side: number): Promise<PickemActionResult>;
  // Ukloni tip (samo dok meč nije počeo).
  removePrediction(userId: number, matchId: number): Promise<PickemActionResult>;
  // Rang lista (top N) + moja pozicija.
  getLeaderboard(userId: number, limit: number): Promise<LeaderboardDto>;
  // Moja statistika + katalog bedževa sa oznakom osvojenih.
  getSummary(userId: number): Promise<PickemSummaryDto>;
  // Poravnanje: obradi neporavnate tipove za završene mečeve (bodovi, streak, bedževi).
  settlePending(): Promise<{ settled: number }>;
}
