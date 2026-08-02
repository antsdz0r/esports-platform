import { BadgeTier } from "../../constants/BadgeDefinitions";

// Pro meč u kontekstu pick'em-a: podaci meča + zajednički glasovi + tip trenutnog korisnika.
// Koristi se i za feed (mečevi za tipovanje) i za "Moji tipovi" (istorija).
export class PickemMatchDto {
  constructor(
    public matchId: number,
    public gameSlug: string,
    public leagueName: string | null,
    public tournamentName: string | null,
    public stage: string | null,
    public team1Name: string | null,
    public team1Logo: string | null,
    public team2Name: string | null,
    public team2Logo: string | null,
    public team1Score: number,
    public team2Score: number,
    public bestOf: number | null,
    public status: string,
    public scheduledAt: string | null,
    public locked: boolean,          // true = tipovanje zatvoreno (meč počeo/gotov)
    public mySide: number | null,    // 1 = team1, 2 = team2, null = nije tipovao
    public myIsCorrect: boolean | null,
    public myPoints: number,
    public team1Votes: number,
    public team2Votes: number,
  ) {}
}

// Jedan red rang liste.
export class LeaderboardEntryDto {
  constructor(
    public rank: number,
    public userId: number,
    public gamerTag: string,
    public profilePicture: string | null,
    public totalPoints: number,
    public correctPredictions: number,
    public totalPredictions: number,
    public accuracy: number,        // 0-100 (%)
    public bestStreak: number,
    public currentStreak: number,
    public badgeCount: number,
  ) {}
}

export class LeaderboardDto {
  constructor(
    public entries: LeaderboardEntryDto[],
    public me: LeaderboardEntryDto | null,   // rang trenutnog korisnika (i kad je van top N)
  ) {}
}

// Katalog bedža sa oznakom da li ga je trenutni korisnik osvojio.
export class BadgeDto {
  constructor(
    public code: string,
    public name: string,
    public description: string,
    public icon: string,
    public tier: BadgeTier,
    public sortOrder: number,
    public earned: boolean,
    public earnedAt: string | null,
  ) {}
}

export class PickemStatsDto {
  constructor(
    public totalPoints: number,
    public predictionsMade: number,     // svi postavljeni tipovi (uklj. neporavnate)
    public totalPredictions: number,    // poravnate predikcije
    public correctPredictions: number,
    public accuracy: number,            // 0-100 (%)
    public currentStreak: number,
    public bestStreak: number,
    public rank: number | null,         // pozicija na rang listi (null ako nema bodova)
  ) {}
}

export class PickemSummaryDto {
  constructor(
    public stats: PickemStatsDto,
    public badges: BadgeDto[],          // ceo katalog, sa earned flag-om
  ) {}
}
