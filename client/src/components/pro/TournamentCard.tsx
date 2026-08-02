import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../ui/motion";
import { analyzeLogo, hueFromString, heroGradientFromHue, type LogoInfo } from "../../helpers/logoColor";
import type { ProTournamentListDto } from "../../models/pro/ProTournamentTypes";

// Hero pozadina po igri — fallback kad nema loga (tema po naslovu).
const GAME_HERO: Record<string, string> = {
  "league-of-legends": "radial-gradient(circle at 50% 32%, rgba(205,160,70,0.30), rgba(18,15,10,0.94))",
  "cs-go": "radial-gradient(circle at 50% 32%, rgba(240,150,40,0.28), rgba(20,15,10,0.94))",
  "cs2": "radial-gradient(circle at 50% 32%, rgba(240,150,40,0.28), rgba(20,15,10,0.94))",
  "cs-2": "radial-gradient(circle at 50% 32%, rgba(240,150,40,0.28), rgba(20,15,10,0.94))",
  "valorant": "radial-gradient(circle at 50% 32%, rgba(255,70,85,0.30), rgba(24,12,14,0.94))",
  "dota-2": "radial-gradient(circle at 50% 32%, rgba(200,60,45,0.30), rgba(22,12,10,0.94))",
  "overwatch": "radial-gradient(circle at 50% 32%, rgba(250,150,40,0.28), rgba(18,15,12,0.94))",
  "ow": "radial-gradient(circle at 50% 32%, rgba(250,150,40,0.28), rgba(18,15,12,0.94))",
};
function heroBg(slug: string): string {
  return GAME_HERO[slug] ?? "radial-gradient(circle at 50% 32%, rgba(0,212,255,0.24), rgba(15,19,40,0.94))";
}

// Placeholder broja gledalaca (stabilan po turniru) — dok ne povučemo pravi broj.
function fakeViewers(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const n = 200 + (h % 47000);
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

const CARD_BG = "linear-gradient(165deg, rgba(34,44,82,0.72), rgba(15,19,40,0.9))";
const CARD_BORDER = "1px solid rgba(78,120,210,0.38)";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? "#fff" : "none"}
      stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function TournamentCard({ t, onOpen, isFavorite, onToggleFavorite, showFavorite = true }: {
  t: ProTournamentListDto;
  onOpen: () => void;
  isFavorite: boolean;
  onToggleFavorite: (t: ProTournamentListDto, next: boolean) => void;
  showFavorite?: boolean;
}) {
  const [info, setInfo] = useState<LogoInfo>({ hue: null, lum: null, multiColor: false });

  useEffect(() => {
    let alive = true;
    setInfo({ hue: null, lum: null, multiColor: false });
    if (t.leagueImageUrl) {
      void analyzeLogo(t.leagueImageUrl).then((r) => { if (alive) setInfo(r); });
    }
    return () => { alive = false; };
  }, [t.leagueImageUrl]);

  // Beli SAMO single-color (monohromatske) logoe; visebojne ostavi kakvi jesu.
  const whiten = info.lum != null && !info.multiColor;

  // Boja pozadine izvedena iz loga (tamna); fallback deterministicki / po igri.
  const bg = info.hue != null
    ? heroGradientFromHue(info.hue)
    : t.leagueImageUrl
      ? heroGradientFromHue(hueFromString(t.externalId))
      : heroBg(t.gameSlug);

  return (
    <motion.div variants={fadeUp} whileHover={{ scale: 1.025, y: -3, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }} onClick={onOpen}
      style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", border: CARD_BORDER, background: CARD_BG, display: "flex", flexDirection: "column" }}>
      {/* Hero — logo turnira/lige kao glavna tema */}
      <div style={{ position: "relative", height: 118, display: "flex", alignItems: "center", justifyContent: "center", background: bg, transition: "background 0.45s ease" }}>
        {t.leagueImageUrl ? (
          <img src={t.leagueImageUrl} alt="" style={{ maxHeight: 70, maxWidth: "72%", objectFit: "contain",
            filter: whiten
              ? "brightness(0) invert(1) drop-shadow(0 3px 10px rgba(0,0,0,0.55))"
              : "drop-shadow(0 6px 18px rgba(0,0,0,0.6))" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, letterSpacing: "0.06em", color: "#fff", textShadow: "0 4px 14px rgba(0,0,0,0.5)" }}>
            {(t.leagueName ?? t.name).slice(0, 4).toUpperCase()}
          </span>
        )}
        {showFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(t, !isFavorite); }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.42)", border: "none", borderRadius: 9, cursor: "pointer", padding: 0, backdropFilter: "blur(4px)" }}>
            <StarIcon filled={isFavorite} />
          </button>
        )}
      </div>
      {/* Footer — naziv + broj gledalaca */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.leagueName ?? t.name}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 3 }}>
          <span style={{ minWidth: 0, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
          <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "var(--text-soft)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--pink)" }} /> {fakeViewers(t.externalId)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
