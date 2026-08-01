import type { ProTournamentMatchDto } from "../../models/pro/ProTournamentTypes";

const CSS = `
.pg-br{display:flex;align-items:stretch;overflow-x:auto;padding-bottom:10px}
.pg-br-col{display:flex;flex-direction:column;flex:0 0 210px;margin-right:36px}
.pg-br-col:last-child{margin-right:0}
.pg-br-title{font-family:var(--font-ui);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);text-align:center;margin-bottom:12px}
.pg-br-body{display:flex;flex-direction:column;justify-content:space-around;flex:1}
.pg-br-pair{display:flex;flex-direction:column;justify-content:space-around;flex:1;position:relative}
.pg-br-cell{position:relative}
.pg-br-col:not(:last-child) .pg-br-cell::after{content:'';position:absolute;right:-18px;top:50%;width:18px;height:2px;background:var(--border-bright)}
.pg-br-col:not(:last-child) .pg-br-pair::after{content:'';position:absolute;right:-18px;top:25%;bottom:25%;border-right:2px solid var(--border-bright)}
.pg-br-col:not(:last-child) .pg-br-pair::before{content:'';position:absolute;right:-36px;top:50%;width:18px;height:2px;background:var(--border-bright)}
`;

function Row({ name, logo, score, won }: { name: string | null; logo: string | null; score: number; won: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {logo ? <img src={logo} alt="" style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0 }} />
            : <span style={{ width: 18, height: 18, flexShrink: 0, display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />}
      <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 12, fontWeight: won ? 800 : 600, color: won ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name ?? "TBD"}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: won ? "var(--green)" : "var(--text-dim)" }}>{score}</span>
    </div>
  );
}

function Box({ m }: { m: ProTournamentMatchDto }) {
  const won1 = m.status === "finished" && m.team1Score > m.team2Score;
  const won2 = m.status === "finished" && m.team2Score > m.team1Score;
  const live = m.status === "live";
  return (
    <div style={{ borderRadius: 8, padding: "7px 10px", background: "var(--bg-card)", border: `1px solid ${live ? "var(--pink)" : "var(--border)"}` }}>
      <Row name={m.team1Name} logo={m.team1Logo} score={m.team1Score} won={won1} />
      <div style={{ height: 1, background: "var(--border)", margin: "5px 0", opacity: 0.5 }} />
      <Row name={m.team2Name} logo={m.team2Logo} score={m.team2Score} won={won2} />
    </div>
  );
}

export default function ProBracket({ matches }: { matches: ProTournamentMatchDto[] }) {
  const rounds = [...new Set(matches.map((m) => m.round).filter((r): r is number => r != null))].sort((a, b) => a - b);

  return (
    <>
      <style>{CSS}</style>
      <div className="pg-br">
        {rounds.map((r, ri) => {
          const ms = matches.filter((m) => m.round === r).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const isLast = ri === rounds.length - 1;
          const pairs: ProTournamentMatchDto[][] = [];
          if (isLast) ms.forEach((m) => pairs.push([m]));
          else for (let i = 0; i < ms.length; i += 2) pairs.push(ms.slice(i, i + 2));
          return (
            <div className="pg-br-col" key={r}>
              <div className="pg-br-title">{isLast ? "Finale" : `Runda ${r}`}</div>
              <div className="pg-br-body">
                {pairs.map((pair, pi) => (
                  <div className="pg-br-pair" key={pi}>
                    {pair.map((m) => <div className="pg-br-cell" key={m.externalId}><Box m={m} /></div>)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
