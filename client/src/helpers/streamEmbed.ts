export type EmbedPlatform = "twitch" | "youtube" | "kick";

export const PLATFORM_LABELS: Record<EmbedPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
};

// Gradi URL ZVANIČNOG embed plejera platforme. Ne re-hostujemo video —
// samo ugrađujemo plejer platforme (Twitch traži parent = hostname stranice).
export function buildEmbedUrl(platform: EmbedPlatform, channel: string): string {
  const ch = encodeURIComponent(channel);
  switch (platform) {
    case "twitch":
      return `https://player.twitch.tv/?channel=${ch}&parent=${window.location.hostname}`;
    case "youtube":
      return `https://www.youtube.com/embed/${ch}`;
    case "kick":
      return `https://player.kick.com/${ch}`;
    default:
      return "";
  }
}
