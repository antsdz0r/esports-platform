import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "../ui/UI";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProTournamentDetailDto, ProTournamentMatchDto } from "../../models/pro/ProTournamentTypes";

const STATUS_COLOR: Record<string, string> = {
  live: "var(--pink)", upcoming: "var(--cyan)", finished: "var(--green)", canceled: "var(--text-dim)",
};

type Tab = "bracket" | "groups" | "matches";

function MatchBox({ m }: { m: ProTournamentMatchDto }) {
  const won1 = m.status === "finished" && m.team1Score > m.team2Score;
  const won2 = m.status === "finished" && m.team2Score > m.team1Score;
  const live = m.status === "live";
  return (
    <div className="pg-glass" style={{ borderRadius: 8, padding: "8px 10px", width: 190, border: `1px solid ${live ? "var(--pink)" : "var(--border)"}` }}>
      <Row name={m.team1Name} logo={m.team1Logo} score={m.team1Score} won={won1} />
      <div style={{ height: 1, background: "var(--border)", margin: "5px 0", opacity: 0.5 }} />
      <Row name={m.team2Name} logo={m.team2Logo} score={m.team2Score} won={won2} />
      {live && <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--pink)", marginTop: 4 }}>● uživo</div>}
    </div>
  );
}

function Row({ name, logo, score, won }: { name: string | null; logo: string | null; score: number; won: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {logo ? <img src={logo} alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0 }} />
            : <span style={{ width: 18, height: 18, flexShrink: 0, display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />}
      <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 12, fontWeight: won ? 800 : 600, color: won ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name ?? "TBD"}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, color: won ? "var(--green)" : "var(--text-dim)" }}>{score}</span>
    </div>
  );
}

export default function ProTournamentDetailModal({ externalId, gameLabel, onClose }: { externalId: string; gameLabel: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ProTournamentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("bracket");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await proTournamentApi.getDetail(externalId);
    if (res.success && res.data) setDetail(res.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [externalId]);
  useEffect(() => {
    const id = window.setInterval(() => { void load(true); }, 30000);
    return () => window.clearInterval(id);
  }, [externalId]);

  const rounds = useMemo(() => {
    const rs = [...new Set((detail?.matches ?? []).map((m) => m.round).filter((r): r is number => r != null))];
    return rs.sort((a, b) => a - b);
  }, [detail]);

  const hasStandings = (detail?.standings.length ?? 0) > 0;

  return createPortal(
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.74)", backdropFilter: "blur(6px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }} onClick={(e) => e.stopPropagation()}
          className="pg-glass" style={{ width: "100%", maxWidth: 920, borderRadius: 18, padding: 22, maxHeight: "92vh", overflowY: "auto", border: "1px solid var(--border-bright)" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--cyan)", padding: "2px 8px", borderRadius: 6, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.30)" }}>{gameLabel}</span>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{detail?.name ?? "Turnir"}</span>
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
            {([["bracket", "Bracket"], ["groups", "Grupe"], ["matches", "Svi mečevi"]] as [Tab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, padding: "8px 14px", cursor: "pointer", background: "none", border: "none",
                  color: tab === key ? "var(--cyan)" : "var(--text-muted)", borderBottom: tab === key ? "2px solid var(--cyan)" : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? <Spinner /> : !detail ? (
            <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: 13, textAlign: "center", padding: 20 }}>Nema podataka za ovaj turnir.</p>
          ) : (
            <>
              {tab === "bracket" && (
                rounds.length > 0 ? (
                  <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                    <div style={{ display: "flex", gap: 18, alignItems: "flex-start", minWidth: "max-content" }}>
                      {rounds.map((r) => (
                        <div key={r} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center" }}>Runda {r}</p>
                          {detail.matches.filter((m) => m.round === r).map((m) => <MatchBox key={m.externalId} m={m} />)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                      Bracket struktura nije dostupna za ovaj turnir — prikaz po mečevima:
                    </p>
                    <MatchList matches={detail.matches} />
                  </div>
                )
              )}

              {tab === "groups" && (
                hasStandings ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui)", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                          <th style={{ padding: "6px 8px" }}>#</th><th style={{ padding: "6px 8px" }}>Tim</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>P</th><th style={{ padding: "6px 8px", textAlign: "center" }}>I</th><th style={{ padding: "6px 8px", textAlign: "center" }}>N</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.standings.map((s, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--border)", color: "var(--text)" }}>
                            <td style={{ padding: "7px 8px", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontWeight: 900 }}>{s.rank ?? i + 1}</td>
                            <td style={{ padding: "7px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                              {s.teamLogo && <img src={s.teamLogo} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                              <span style={{ fontFamily: "var(--font-head)", fontWeight: 700 }}>{s.teamName ?? "—"}</span>
                            </td>
                            <td style={{ padding: "7px 8px", textAlign: "center", color: "var(--green)" }}>{s.wins}</td>
                            <td style={{ padding: "7px 8px", textAlign: "center", color: "var(--pink)" }}>{s.losses}</td>
                            <td style={{ padding: "7px 8px", textAlign: "center", color: "var(--text-muted)" }}>{s.ties}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Nema tabele/grupa za ovaj turnir.</p>
                )
              )}

              {tab === "matches" && <MatchList matches={detail.matches} />}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function MatchList({ matches }: { matches: ProTournamentMatchDto[] }) {
  if (matches.length === 0) return <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Nema mečeva.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {matches.map((m) => {
        const won1 = m.status === "finished" && m.team1Score > m.team2Score;
        const won2 = m.status === "finished" && m.team2Score > m.team1Score;
        const when = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString("sr-RS", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
        return (
          <div key={m.externalId} className="pg-glass" style={{ borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[m.status] ?? "var(--text-dim)", flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: "right", fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won1 ? 800 : 600, color: won1 ? "var(--text)" : "var(--text-muted)" }}>{m.team1Name ?? "TBD"}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--text)", minWidth: 44, textAlign: "center" }}>{m.team1Score} : {m.team2Score}</span>
            <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won2 ? 800 : 600, color: won2 ? "var(--text)" : "var(--text-muted)" }}>{m.team2Name ?? "TBD"}</span>
            {when && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{when}</span>}
          </div>
        );
      })}
    </div>
  );
}
