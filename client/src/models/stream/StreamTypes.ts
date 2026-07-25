export type StreamPlatform = "twitch" | "youtube" | "kick";
export type StreamType = "official" | "cocast" | "caster";

export interface MatchStream {
  streamId: number;
  gameId: number;
  platform: StreamPlatform;
  channel: string;
  type: StreamType;
  language: string;
  title: string | null;
  isActive: boolean;
}

export interface StreamInput {
  platform: StreamPlatform;
  channel: string;
  type: StreamType;
  language: string;
  title?: string | null;
  isActive?: boolean;
}
