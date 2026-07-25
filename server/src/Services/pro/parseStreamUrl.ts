import { StreamPlatform } from "../../Domain/enums/StreamPlatform";

// Iz sirovog stream URL-a izvlacimo platformu i kanal/video-id koji nas
// StreamEmbed koristi da izgradi zvanicni embed plejer. Podrzavamo Twitch,
// Kick i YouTube (samo kad postoji video ID — handle kanali se ne mogu
// pouzdano embedovati, pa se preskacu).
export function parseStreamUrl(rawUrl: string): { platform: StreamPlatform; channel: string } | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  const twitch = url.match(/twitch\.tv\/([A-Za-z0-9_]{2,60})/i);
  if (twitch) return { platform: StreamPlatform.TWITCH, channel: twitch[1] };

  const kick = url.match(/kick\.com\/([A-Za-z0-9_]{2,60})/i);
  if (kick) return { platform: StreamPlatform.KICK, channel: kick[1] };

  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i);
  if (youtube) return { platform: StreamPlatform.YOUTUBE, channel: youtube[1] };

  return null;
}
