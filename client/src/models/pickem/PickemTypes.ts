import type { ProMatchStatus } from "../pro/ProTypes";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

// Pro meč u kontekstu pick'em-a (feed za tipovanje ili istorija "Moji tipovi").
export interface PickemMatch {
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
  status: ProMatchStatus;
  scheduledAt: string | null;
  locked: boolean;             // true = tipovanje zatvoreno
  mySide: number | null;       // 1 = team1, 2 = team2, null = nema tipa
  myIsCorrect: boolean | null; // posle poravnanja
  myPoints: number;
  team1Votes: number;
  team2Votes: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  gamerTag: string;
  profilePicture: string | null;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number;
  bestStreak: number;
  currentStreak: number;
  badgeCount: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  sortOrder: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface PickemStats {
  totalPoints: number;
  predictionsMade: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  rank: number | null;
}

export interface PickemSummary {
  stats: PickemStats;
  badges: Badge[];
}
