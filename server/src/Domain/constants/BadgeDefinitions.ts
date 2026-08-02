// Katalog bedževa + kriterijumi za dodelu žive u kodu (nula-trošak, bez seed migracije).
// U bazi (USER_BADGES) se pamti samo koji je korisnik osvojio koji bedž (po `code`).
// BadgeService evaluira ove definicije nad snapshot-om korisnikove pick'em statistike.

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

// Sve što je potrebno za proveru kriterijuma jednog bedža.
export interface BadgeSnapshot {
  predictionsMade: number;      // ukupno postavljenih tipova (uklj. neporavnate)
  totalPredictions: number;     // poravnate predikcije (rešeni mečevi)
  correctPredictions: number;   // tačne poravnate predikcije
  totalPoints: number;          // ukupno bodova
  bestStreak: number;           // najduži niz uzastopnih pogodaka
  currentStreak: number;        // trenutni niz
}

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  sortOrder: number;
  test: (s: BadgeSnapshot) => boolean;
}

// Prag tačnosti (Snajperista) računa se samo uz dovoljno uzoraka da % ima smisla.
const ACCURACY_MIN_SAMPLE = 20;

export const BADGE_DEFS: BadgeDefinition[] = [
  {
    code: "first_pick",
    name: "Rookie",
    description: "You placed your first pick.",
    icon: "🎫",
    tier: "bronze",
    sortOrder: 10,
    test: (s) => s.predictionsMade >= 1,
  },
  {
    code: "first_correct",
    name: "First Hit",
    description: "Your first correct prediction.",
    icon: "🎯",
    tier: "bronze",
    sortOrder: 20,
    test: (s) => s.correctPredictions >= 1,
  },
  {
    code: "streak_3",
    name: "Warmup",
    description: "3 correct picks in a row.",
    icon: "🔥",
    tier: "bronze",
    sortOrder: 30,
    test: (s) => s.bestStreak >= 3,
  },
  {
    code: "sharp_10",
    name: "Sharp Eye",
    description: "10 correct predictions.",
    icon: "👁️",
    tier: "silver",
    sortOrder: 40,
    test: (s) => s.correctPredictions >= 10,
  },
  {
    code: "streak_5",
    name: "Fireworks",
    description: "5 correct picks in a row.",
    icon: "🎆",
    tier: "silver",
    sortOrder: 50,
    test: (s) => s.bestStreak >= 5,
  },
  {
    code: "points_100",
    name: "Century",
    description: "You reached 100 points.",
    icon: "💯",
    tier: "silver",
    sortOrder: 60,
    test: (s) => s.totalPoints >= 100,
  },
  {
    code: "veteran_25",
    name: "Veteran",
    description: "25 settled predictions.",
    icon: "🛡️",
    tier: "silver",
    sortOrder: 70,
    test: (s) => s.totalPredictions >= 25,
  },
  {
    code: "sharp_50",
    name: "Oracle",
    description: "50 correct predictions.",
    icon: "🔮",
    tier: "gold",
    sortOrder: 80,
    test: (s) => s.correctPredictions >= 50,
  },
  {
    code: "streak_10",
    name: "Unstoppable",
    description: "10 correct picks in a row.",
    icon: "⚡",
    tier: "gold",
    sortOrder: 90,
    test: (s) => s.bestStreak >= 10,
  },
  {
    code: "points_500",
    name: "Elite",
    description: "You reached 500 points.",
    icon: "👑",
    tier: "gold",
    sortOrder: 100,
    test: (s) => s.totalPoints >= 500,
  },
  {
    code: "sniper",
    name: "Sniper",
    description: "70%+ accuracy over 20+ picks.",
    icon: "🎖️",
    tier: "platinum",
    sortOrder: 110,
    test: (s) =>
      s.totalPredictions >= ACCURACY_MIN_SAMPLE &&
      s.correctPredictions / s.totalPredictions >= 0.7,
  },
];

// Brzi lookup po code-u (za frontend katalog i validaciju).
export const BADGE_BY_CODE: Record<string, BadgeDefinition> = Object.fromEntries(
  BADGE_DEFS.map((b) => [b.code, b])
);
