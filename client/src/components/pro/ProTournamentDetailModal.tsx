import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "../ui/UI";
import ProBracket from "./ProBracket";
import { proTournamentApi } from "../../api_services/pro/ProTournamentAPIService";
import type { ProTournamentDetailDto, ProTournamentMatchDto } from "../../models/pro/ProTournamentTypes";

const STATUS_COLOR: Record<string, string> = {
  live: "var(--pink)", upcoming: "var(--cyan)", finished: "var(--green)", canceled: "var(--text-dim)",
};

// Jedinstven stil reda-kartice za Schedule/Results/Groups — fiksna visina da su svi identicni.
const ROW_STYLE: CSSProperties = { borderRadius: 10, padding: "0 16px", height: 54, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12 };

type Tab = "bracket" | "groups" | "schedule" | "results";

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
          className="pg-glass" style={{ width: "100%", maxWidth: 920, borderRadius: 18, padding: 22, height: "min(82vh, 760px)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-bright)" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--cyan)", padding: "2px 8px", borderRadius: 6, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.30)" }}>{gameLabel}</span>
            <span style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{detail?.name ?? "Turnir"}</span>
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {loading ? <Spinner /> : !detail ? (
            <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: 13, textAlign: "center", padding: 20 }}>Nema podataka za ovaj turnir.</p>
          ) : (() => {
            const at = (m: ProTournamentMatchDto) => (m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0);
            // Schedule: uzivo + predstojeci, od najskorijeg ka najdaljem (uzivo na vrh).
            const schedule = detail.matches
              .filter((m) => m.status === "live" || m.status === "upcoming")
              .sort((a, b) => (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) || at(a) - at(b));
            // Results: zavrseni/otkazani, najnoviji prvi.
            const results = detail.matches
              .filter((m) => m.status === "finished" || m.status === "canceled")
              .sort((a, b) => at(b) - at(a));

            const tabDefs: [Tab, string][] = [];
            if (detail.hasBracket) tabDefs.push(["bracket", "Bracket"]);
            tabDefs.push(["schedule", "Schedule"], ["results", "Results"]);
            if (detail.standings.length > 0) tabDefs.push(["groups", "Groups"]);
            const activeTab: Tab = tabDefs.some(([k]) => k === tab) ? tab : tabDefs[0][0];
            return (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                  {tabDefs.map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                      style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, padding: "8px 14px", cursor: "pointer", background: "none", border: "none",
                        color: activeTab === key ? "var(--cyan)" : "var(--text-muted)", borderBottom: activeTab === key ? "2px solid var(--cyan)" : "2px solid transparent" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {activeTab === "bracket" && (
                  rounds.length > 0 ? <ProBracket matches={detail.matches} /> : <MatchList matches={detail.matches} />
                )}

                {activeTab === "groups" && (
                  hasStandings ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                        <span style={{ width: 24, flexShrink: 0 }}>#</span>
                        <span style={{ flex: 1 }}>Tim</span>
                        <span style={{ width: 40, textAlign: "center", flexShrink: 0 }}>P</span>
                        <span style={{ width: 40, textAlign: "center", flexShrink: 0 }}>I</span>
                        <span style={{ width: 40, textAlign: "center", flexShrink: 0 }}>N</span>
                      </div>
                      {detail.standings.map((s, i) => (
                        <div key={i} className="pg-glass" style={ROW_STYLE}>
                          <span style={{ width: 24, flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--text-dim)" }}>{s.rank ?? i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            <TeamIcon logo={s.teamLogo} />
                            <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.teamName ?? "—"}</span>
                          </div>
                          <span style={{ width: 40, textAlign: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--green)" }}>{s.wins}</span>
                          <span style={{ width: 40, textAlign: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--pink)" }}>{s.losses}</span>
                          <span style={{ width: 40, textAlign: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: "var(--text-muted)" }}>{s.ties}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Nema tabele/grupa za ovaj turnir.</p>
                  )
                )}

                {activeTab === "schedule" && <MatchList matches={schedule} />}
                {activeTab === "results" && <MatchList matches={results} />}
                </div>
              </>
            );
          })()}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function TeamIcon({ logo }: { logo: string | null }) {
  return logo
    ? <img src={logo} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
    : <span style={{ width: 20, height: 20, flexShrink: 0, display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 5 }} />;
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
          <div key={m.externalId} className="pg-glass" style={ROW_STYLE}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[m.status] ?? "var(--text-dim)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won1 ? 800 : 600, color: won1 ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.team1Name ?? "TBD"}</span>
              <TeamIcon logo={m.team1Logo} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: m.status === "upcoming" ? "var(--text-dim)" : "var(--text)", width: 56, textAlign: "center", flexShrink: 0 }}>
              {m.status === "upcoming" ? "VS" : `${m.team1Score} : ${m.team2Score}`}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <TeamIcon logo={m.team2Logo} />
              <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: won2 ? 800 : 600, color: won2 ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.team2Name ?? "TBD"}</span>
            </div>
            <span style={{ width: 92, flexShrink: 0, textAlign: "right", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{when ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
