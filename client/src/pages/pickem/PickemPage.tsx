import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, StatCard } from "../../components/ui/UI";
import { staggerContainer } from "../../components/ui/motion";
import PickCard from "../../components/pickem/PickCard";
import BadgeShelf from "../../components/pickem/BadgeShelf";
import PickemLeaderboard from "../../components/pickem/PickemLeaderboard";
import { pickemApi } from "../../api_services/pickem/PickemAPIService";
import type { PickemMatch, PickemSummary, Leaderboard } from "../../models/pickem/PickemTypes";

type Tab = "predict" | "mine" | "leaderboard" | "badges";
type PredictFilter = "all" | "open" | "live" | "finished";

const TABS: { key: Tab; label: string }[] = [
  { key: "predict", label: "Predict" },
  { key: "mine", label: "My picks" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "badges", label: "Badges" },
];

const PREDICT_FILTERS: { key: PredictFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "live", label: "Live" },
  { key: "finished", label: "Finished" },
];

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
    padding: "6px 14px", borderRadius: 8, cursor: "pointer",
    background: active ? "rgba(0,212,255,0.16)" : "rgba(255,255,255,0.03)",
    color: active ? "var(--text)" : "var(--text-muted)",
    border: active ? "1px solid rgba(0,212,255,0.45)" : "1px solid var(--border)",
  };
}

export default function PickemPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;

  const [tab, setTab] = useState<Tab>("predict");
  const [predictFilter, setPredictFilter] = useState<PredictFilter>("all");

  const [matches, setMatches] = useState<PickemMatch[]>([]);
  const [myPicks, setMyPicks] = useState<PickemMatch[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [summary, setSummary] = useState<PickemSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadMatches = async () => {
    const res = await pickemApi.getMatches(80);
    if (res.success && res.data) setMatches(res.data);
    else setError(res.message ?? "Failed to load matches");
  };
  const loadSummary = async () => {
    const res = await pickemApi.getSummary();
    if (res.success && res.data) setSummary(res.data);
  };
  const loadLeaderboard = async () => {
    const res = await pickemApi.getLeaderboard(50);
    if (res.success && res.data) setLeaderboard(res.data);
  };
  const loadMine = async () => {
    const res = await pickemApi.getMyPredictions(100);
    if (res.success && res.data) setMyPicks(res.data);
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([loadMatches(), loadSummary()]);
      setLoading(false);
    })();
  }, []);

  // Lazy-load per tab on first open.
  useEffect(() => {
    if (tab === "leaderboard" && !leaderboard) void loadLeaderboard();
    if (tab === "mine" && !myPicks) void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Silent refresh to catch settlement results (points/badges) without a spinner.
  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMatches();
      void loadSummary();
      if (myPicks) void loadMine();
      if (leaderboard) void loadLeaderboard();
    }, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPicks, leaderboard]);

  const afterChange = async () => {
    await Promise.all([loadMatches(), loadSummary(), myPicks ? loadMine() : Promise.resolve()]);
  };

  const handlePick = async (matchId: number, side: 1 | 2) => {
    setBusyId(matchId);
    setError(""); setSuccess("");
    const res = await pickemApi.predict(matchId, side);
    if (res.success) { setSuccess("Pick saved"); await afterChange(); }
    else setError(res.message ?? "Failed to save your pick");
    setBusyId(null);
  };

  const handleRemove = async (matchId: number) => {
    setBusyId(matchId);
    setError(""); setSuccess("");
    const res = await pickemApi.removePrediction(matchId);
    if (res.success) { setSuccess("Pick removed"); await afterChange(); }
    else setError(res.message ?? "Failed to remove your pick");
    setBusyId(null);
  };

  const visibleMatches = useMemo(() => matches.filter((m) => {
    if (predictFilter === "open") return !m.locked;
    if (predictFilter === "live") return m.status === "live";
    if (predictFilter === "finished") return m.status === "finished";
    return true;
  }), [matches, predictFilter]);

  const stats = summary?.stats;

  return (
    <div>
      <PageHeader eyebrow="Predict · Compete · Earn" title="Pick'em" />

      {success && <SuccessBox message={success} />}
      {error && <ErrorBox message={error} />}

      {/* Stat cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 26 }}>
          <StatCard label="Points" value={stats.totalPoints} sub={stats.rank ? `Rank #${stats.rank}` : "Unranked"} color="var(--cyan)" icon="🎯" />
          <StatCard label="Accuracy" value={`${stats.accuracy}%`} sub={`${stats.correctPredictions}/${stats.totalPredictions} correct`} color="var(--green)" icon="✓" />
          <StatCard label="Current streak" value={stats.currentStreak} sub={`Best ${stats.bestStreak}`} color="var(--gold)" icon="🔥" />
          <StatCard label="Predictions" value={stats.predictionsMade} sub={`${stats.totalPredictions} settled`} color="var(--violet2)" icon="📊" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={chipStyle(tab === t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === "predict" && (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                {PREDICT_FILTERS.map((f) => (
                  <button key={f.key} onClick={() => setPredictFilter(f.key)} style={chipStyle(predictFilter === f.key)}>{f.label}</button>
                ))}
              </div>
              {visibleMatches.length === 0 ? (
                <Empty message="No matches to show. Check back when new pro matches are scheduled." />
              ) : (
                <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {visibleMatches.map((m) => (
                    <PickCard key={m.matchId} match={m} busy={busyId === m.matchId} onPick={handlePick} onRemove={handleRemove} />
                  ))}
                </motion.div>
              )}
            </>
          )}

          {tab === "mine" && (
            !myPicks ? <Spinner /> : myPicks.length === 0 ? (
              <Empty message="You haven't made any picks yet. Head to Predict and call some winners." />
            ) : (
              <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {myPicks.map((m) => (
                  <PickCard key={m.matchId} match={m} busy={busyId === m.matchId} onPick={handlePick} onRemove={handleRemove} />
                ))}
              </motion.div>
            )
          )}

          {tab === "leaderboard" && (
            !leaderboard ? <Spinner /> : leaderboard.entries.length === 0 ? (
              <Empty message="The leaderboard is empty. Be the first to score points!" />
            ) : (
              <PickemLeaderboard data={leaderboard} currentUserId={userId} />
            )
          )}

          {tab === "badges" && (
            !summary ? <Spinner /> : <BadgeShelf badges={summary.badges} />
          )}
        </>
      )}
    </div>
  );
}
