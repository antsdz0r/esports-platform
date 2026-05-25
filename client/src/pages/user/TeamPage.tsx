import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader } from "../../components/ui/UI";

interface Team {
  team_id: number;
  team_name: string;
  tag: string;
  logo: string;
  description: string;
}

const BASE = import.meta.env.VITE_API_URL;

export default function TeamsPage() {
  const { token } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ teamName: "", tag: "", logo: "", description: "" });
  const [creating, setCreating] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };


 useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}teams`, { headers });
      const data = await res.json();
      setTeams(data.success ? data.data : []);
    } catch {
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };
  void load();
}, [token]);

  const createTeam = async () => {
    if (!form.teamName || !form.tag) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}teams`, {
        method: "POST", headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setShowCreate(false); setForm({ teamName: "", tag: "", logo: "", description: "" }); window.location.reload(); }
      else setError(data.message);
    } catch {
      setError("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader eyebrow="Teams" title="Your Teams" />
        <button onClick={() => setShowCreate(true)}
          className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
          + New Team
        </button>
      </div>

      {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

      {showCreate && (
        <div className="mb-6 bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-white text-sm font-semibold">Create Team</p>
          <input placeholder="Team name" value={form.teamName} onChange={e => setForm({ ...form, teamName: e.target.value })}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30" />
          <input placeholder="Tag (e.g. TST)" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30" />
          <input placeholder="Logo URL (optional)" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30" />
          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30" />
          <div className="flex gap-2">
            <button onClick={createTeam} disabled={creating}
              className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-colors">
              {creating ? "Creating..." : "Create"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="text-white/40 text-sm px-4 py-2 rounded-xl hover:text-white/70 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : teams.length === 0 ? (
        <p className="text-white/30 text-sm">No teams yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map(t => (
            <div key={t.team_id} className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {t.logo ? (
                        <img src={t.logo} alt={t.tag} className="w-10 h-10 object-cover" />
                    ) : (
                    <span className="text-white/50 text-sm font-bold">{t.tag?.slice(0, 2)}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{t.team_name}</p>
                    <p className="text-white/30 text-xs mt-0.5">{t.description || "No description"}</p>
                </div>
                <span className="text-white/20 text-xs border border-white/10 px-2 py-1 rounded-lg">{t.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}