import { Prediction } from "../../models/Prediction";

// Broj glasova po strani za jedan meč (zajednička statistika tipovanja).
export interface VoteCountRow {
  proMatchId: number;
  side1: number;
  side2: number;
}

// Red za poravnanje: neporavnata predikcija + finalni skor meča.
export interface SettleRow {
  predictionId: number;
  userId: number;
  proMatchId: number;
  predictedSide: number;
  team1Score: number;
  team2Score: number;
}

// Predikcija spojena sa podacima meča (za "Moji tipovi" / istoriju).
export interface PredictionMatchRow {
  matchId: number;
  gameSlug: string;
  leagueName: string | null;
  tournamentName: string | null;
  stage: string | null;
  team1Name: string | null;
  team1Logo: string | null;
  team2Name: string | null;
  team2Logo: string | null;
  team1Score: number;
  team2Score: number;
  bestOf: number | null;
  status: string;
  scheduledAt: Date | null;
  predictedSide: number;
  isCorrect: boolean | null;
  pointsAwarded: number;
}

export interface IPredictionRepository {
  // Postavi/izmeni tip (upsert po user+meč). Servis proverava da meč nije zaključan.
  upsert(userId: number, proMatchId: number, side: number): Promise<void>;
  // Ukloni tip — samo ako još nije poravnat (meč nije završen).
  remove(userId: number, proMatchId: number): Promise<void>;
  // Tipovi datog korisnika za skup mečeva (za attach mySide na feed).
  findByUserAndMatches(userId: number, matchIds: number[]): Promise<Prediction[]>;
  // Broj glasova po strani za skup mečeva.
  countVotesByMatch(matchIds: number[]): Promise<VoteCountRow[]>;
  // Ukupno postavljenih tipova (uklj. neporavnate) — za badge snapshot.
  countForUser(userId: number): Promise<number>;
  // Istorija tipova jednog korisnika (spoj sa mečevima), najnoviji prvi.
  findHistoryForUser(userId: number, limit: number): Promise<PredictionMatchRow[]>;

  // ── Poravnanje (settlement) ──
  // Neporavnate predikcije čiji je meč završen sa odlučenim pobednikom, hronološki.
  findUnsettledSettleable(): Promise<SettleRow[]>;
  // Označi predikciju poravnatom.
  markSettled(predictionId: number, isCorrect: boolean, points: number): Promise<void>;
  // Obriši neporavnate tipove za otkazane mečeve (void — ne ulaze u statistiku).
  deleteUnsettledForCanceled(): Promise<number>;
}
