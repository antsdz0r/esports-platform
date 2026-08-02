import { useEffect, useMemo, useState } from "react";
import { streamApi } from "../../api_services/streams/StreamAPIService";
import type { MatchStream, StreamType } from "../../models/stream/StreamTypes";
import StreamEmbed, { type EmbedStream } from "./StreamEmbed";
import { PLATFORM_LABELS } from "../../helpers/streamEmbed";

interface StreamPlayerProps {
  gameId: number;
}

const TYPE_LABELS: Record<StreamType, string> = {
  official: "Official",
  cocast: "Co-stream",
  caster: "Caster",
};

export default function StreamPlayer({ gameId }: StreamPlayerProps) {
  const [streams, setStreams] = useState<MatchStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const res = await streamApi.getForMatch(gameId);
      if (!active) return;
      if (res.success && res.data) setStreams(res.data);
      else setError(res.message ?? "Failed to load streams");
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [gameId]);

  const embeds = useMemo<EmbedStream[]>(
    () => streams.map((s) => ({
      key: String(s.streamId),
      platform: s.platform,
      channel: s.channel,
      label: s.title?.trim() || TYPE_LABELS[s.type],
      sub: `${PLATFORM_LABELS[s.platform]} · ${s.language.toUpperCase()}`,
    })),
    [streams]
  );

  if (loading) {
    return <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: 13 }}>Loading streams…</div>;
  }
  if (error) {
    return <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: 13 }}>{error}</div>;
  }

  return <StreamEmbed streams={embeds} />;
}
