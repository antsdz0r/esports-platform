import { useState } from "react";
import { buildEmbedUrl, PLATFORM_LABELS, type EmbedPlatform } from "../../helpers/streamEmbed";

export interface EmbedStream {
  key: string;
  platform: EmbedPlatform;
  channel: string;
  label: string;
  sub?: string;
}

// Prezentaciona komponenta: prima listu streamova i renderuje plejer sa
// izborom izvora. Koriste je i korisnicki mečevi (StreamPlayer) i pro mečevi.
// emptyTitle/emptySub omogucavaju status-svestan tekst kad nema streamova.
export default function StreamEmbed({ streams, emptyTitle, emptySub }: {
  streams: EmbedStream[];
  emptyTitle?: string;
  emptySub?: string;
}) {
  const [selected, setSelected] = useState(0);

  if (streams.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        aspectRatio: "16 / 9", borderRadius: 12, border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.03)", color: "var(--text-muted)",
        fontFamily: "var(--font-ui)", fontSize: 13, gap: 6,
      }}>
        <span style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{emptyTitle ?? "Nema dostupnih streamova"}</span>
        <span>{emptySub ?? "Stream se pojavljuje kada meč krene uživo."}</span>
      </div>
    );
  }

  const idx = Math.min(selected, streams.length - 1);
  const cur = streams[idx];

  return (
    <div>
      <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#0c0c0e" }}>
        <iframe
          key={cur.key}
          src={buildEmbedUrl(cur.platform, cur.channel)}
          title={cur.label}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
      </div>

      {streams.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {streams.map((s, i) => {
            const active = i === idx;
            return (
              <button key={s.key} onClick={() => setSelected(i)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
                  padding: "7px 12px", borderRadius: 8,
                  background: active ? "var(--violet)" : "rgba(255,255,255,0.04)",
                  color: active ? "#0c0c0e" : "var(--text-muted)",
                  border: active ? "1px solid var(--violet)" : "1px solid var(--border)",
                }}>
                <span>{s.label}</span>
                <span style={{ opacity: 0.75, fontWeight: 600 }}>{s.sub ?? PLATFORM_LABELS[s.platform]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
