export type ProMatchStatus = "upcoming" | "live" | "finished" | "canceled";

export interface ProStream {
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  language: string;
  isOfficial: boolean;
}

// Admin prikaz streamova jednog meca — sadrzi id (za brisanje) i source
// ('pandascore' = automatski, 'local' = rucno dodat, jedini koji se brise).
export interface ProStreamAdmin {
  id: number;
  proMatchId: number;
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  language: string;
  isOfficial: boolean;
  source: string;
}

export interface ProMatch {
  id: number;
  gameSlug: string;
  leagueName: string | null;
  serieName: string | null;
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
  streams: ProStream[];
}
