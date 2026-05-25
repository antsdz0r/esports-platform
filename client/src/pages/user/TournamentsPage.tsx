import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader } from "../../components/ui/UI";

interface Tournament {
  tournamentid: number;
  name: string;
  format: string;
  max_teams: number;
  status: string;
  prize_pool: number;
  registration_deadline: string;
}

const BASE = import.meta.env.VITE_API_URL;

export default function TournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}tournaments`, { headers });
        const data = await res.json();
        setTournaments(data.success ? data.data : []);
      } catch {
        setError("Failed to load tournaments");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const register = async (tournamentId: number, teamId: number) => {
    try {
      const res = await fetch(`${BASE}tournaments/${tournamentId}/register`, {
        method: "POST", headers,
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!data.success) setError(data.message);
      else window.location.reload();
    } catch {
      setError("Failed to register");
    }
  };

  const statusColor = (s: string) => {
    if (s === "open") return "text-green-400";
    if (s === "ongoing") return "text-yellow-400";
    if (s === "completed") return "text-white/30";
    return "text-white/40";
  };

  return (
    <div>
      <PageHeader eyebrow="Tournaments" title="All Tournaments" />
      {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : tournaments.length === 0 ? (
        <p className="text-white/30 text-sm">No tournaments available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 mt-6">
          {tournaments.map(t => (
            <div key={t.tournamentid} className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-semibold">{t.name}</p>
                <span className={`text-xs font-medium ${statusColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="flex gap-4 text-xs text-white/30 mb-3">
                <span>Format: {t.format}</span>
                <span>Teams: {t.max_teams}</span>
                <span>Prize: ${t.prize_pool}</span>
                <span>Deadline: {new Date(t.registration_deadline).toLocaleDateString()}</span>
              </div>
              {t.status === "open" && (
                <button onClick={() => register(t.tournamentid, 1)}
                  className="text-xs bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors">
                  Register Team
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}