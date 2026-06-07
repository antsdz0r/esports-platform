import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, StatusBadge, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface Tournament {
  tournamentId: number;
  name: string;
  format: string;
  status: string;
  prizePool: number;
  maxTeams: number;
  registrationDeadLine?: string;
  registrationDeadline?: string;
  gameName?: string | null;
  gameId?: number;
  registrations: Registration[];
}

interface Registration {
  teamId: number;
  teamName: string | null;
  status: string;
  seed: number | null;
}

interface Match {
  gameId: number;
  team1Id: number | null;
  team2Id: number | null;
  team1Name: string | null;
  team2Name: string | null;
  round: number;
  score: string;
  status: string;
  winnerTeamId: number | null;
  scheduledTime: string | null;
}

interface TeamMemberInfo {
  playerId: number;
  gamerTag: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

const BASE = import.meta.env.VITE_API_URL;

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "Single Elimination",
  double_elim: "Double Elimination",
  round_robin: "Round Robin",
};

export default function TournamentDetailPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Team members modal state
  const [membersModal, setMembersModal] = useState<{ teamId: number; teamName: string } | null>(null);

  // Registration status update
  const [regUpdating, setRegUpdating] = useState<number | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`${BASE}tournaments/${id}`, { headers }),
        fetch(`${BASE}matches/tournament/${id}`, { headers }),
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      if (!tRes.ok) { setError("Turnir nije pronađen"); return; }
      setTournament(tData);
      setMatches(mData.success ? mData.data : []);
    } catch {
      setError("Greška pri učitavanju");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id, token]);

  const updateStatus = async (newStatus: string) => {
    if (!tournament) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`${BASE}tournaments/${tournament.tournamentId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: tournament.name,
          gameId: tournament.gameId,
          format: tournament.format,
          maxTeams: tournament.maxTeams,
          registrationDeadline: deadline,
          prizePool: tournament.prizePool,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Greška pri izmeni statusa"); return; }
      setSuccess(`Status promenjen u "${newStatus}"`);
      await load();
    } catch {
      setError("Greška pri izmeni statusa");
    } finally {
      setStatusUpdating(false);
    }
  };

  const updateRegistration = async (teamId: number, newStatus: "confirmed" | "disqualified") => {
    if (!id) return;
    setRegUpdating(teamId);
    try {
      const res = await fetch(`${BASE}tournaments/${id}/registrations/${teamId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Greška pri ažuriranju prijave"); return; }
      setSuccess(newStatus === "confirmed" ? "Tim potvrđen ✓" : "Tim diskvalifikovan");
      await load();
    } catch {
      setError("Greška pri ažuriranju prijave");
    } finally {
      setRegUpdating(null);
    }
  };

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>;
  if (error || !tournament) return <div style={{ padding: 40 }}><ErrorBox message={error || "Turnir nije pronađen"} /></div>;

  const deadline = tournament.registrationDeadLine ?? tournament.registrationDeadline ?? "";
  const deadlineDisplay = deadline ? new Date(deadline).toLocaleDateString("sr") : "—";

  const backPath = isAdmin ? "/admin/tournaments" : "/dashboard/tournaments";
  const registrations = tournament.registrations ?? [];
  const rounds = matches.length > 0 ? [...new Set(matches.map(m => m.round))].sort((a, b) => a - b) : [];
  const hasMatches = matches.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? "Admin · Turniri" : "Takmičenja"}
        title={tournament.name}
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <PgBtn variant="ghost" size="sm" onClick={() => navigate(backPath)}>← Nazad</PgBtn>
            {isAdmin && tournament.status === "locked" && (
              <PgBtn variant="primary" size="sm" disabled={statusUpdating} onClick={() => updateStatus("ongoing")}>
                {statusUpdating ? "..." : "▶ Pokreni turnir"}
              </PgBtn>
            )}
            {isAdmin && tournament.status === "ongoing" && (
              <PgBtn variant="cyan" size="sm" disabled={statusUpdating} onClick={() => updateStatus("completed")}>
                {statusUpdating ? "..." : "✓ Završi turnir"}
              </PgBtn>
            )}
          </div>
        }
      />

      {success && <SuccessBox message={success} />}
      {error && <ErrorBox message={error} />}

      {/* Tournament meta */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        {[
          { label: "Status", value: <StatusBadge status={tournament.status} /> },
          { label: "Format", value: FORMAT_LABEL[tournament.format] ?? tournament.format },
          { label: "Igra", value: tournament.gameName ?? "—" },
          { label: "Timovi", value: `${registrations.length}/${tournament.maxTeams}` },
          { label: "Nagrada", value: tournament.prizePool > 0 ? `$${tournament.prizePool}` : "—" },
          { label: "Rok prijave", value: deadlineDisplay },
        ].map(({ label, value }) => (
          <div key={label} className="pg-glass" style={{ padding: "14px 20px", borderRadius: 12, minWidth: 110 }}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{value}</div>
          </div>
        ))}
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: hasMatches ? "280px 1fr" : "280px 1fr", gap: 24, alignItems: "start" }}>
        {/* Registered Teams */}
        <motion.div variants={staggerContainer(0.05)} initial="hidden" animate="show">
          <SectionTitle label="Prijavljeni timovi" count={registrations.length} />
          {registrations.length === 0 ? (
            <Empty message="Nema prijavljenih timova." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...registrations]
                .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
                .map((reg, i) => (
                  <motion.div key={reg.teamId} variants={fadeUp}
                    className="pg-glass"
                    style={{ padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onClick={() => setMembersModal({ teamId: reg.teamId, teamName: reg.teamName ?? `Tim #${reg.teamId}` })}
                    title="Klikni za detalje članova">
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "var(--text-dim)", minWidth: 20, textAlign: "center" }}>
                      {reg.seed ?? (i + 1)}
                    </span>
                    <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {reg.teamName ?? `Tim #${reg.teamId}`}
                    </span>
                    <TeamStatusBadge status={reg.status} />
                    {isAdmin && reg.status === "pending" && (
                      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={regUpdating === reg.teamId}
                          onClick={() => void updateRegistration(reg.teamId, "confirmed")}
                          style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--green)", background: "rgba(0,255,136,0.1)", color: "var(--green)", cursor: "pointer" }}>
                          {regUpdating === reg.teamId ? "..." : "✓"}
                        </button>
                        <button
                          disabled={regUpdating === reg.teamId}
                          onClick={() => void updateRegistration(reg.teamId, "disqualified")}
                          style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--pink)", background: "rgba(255,0,128,0.1)", color: "var(--pink)", cursor: "pointer" }}>
                          ✕
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>
          )}
        </motion.div>

        {/* Bracket */}
        <div>
          <SectionTitle label="Bracket" count={matches.length} />
          {hasMatches ? (
            <div style={{ overflowX: "auto", paddingBottom: 12 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", minWidth: "max-content" }}>
                {rounds.map(round => {
                  const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.gameId - b.gameId);
                  return (
                    <div key={round} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", textAlign: "center", marginBottom: 4 }}>
                        {roundLabel(round, rounds.length)}
                      </p>
                      {roundMatches.map(match => (
                        <MatchCard key={match.gameId} match={match} isAdmin={isAdmin} token={token ?? ""} tournamentId={id ?? ""} onRefresh={load} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)" }}>
                  {tournament.status === "open"
                    ? "Bracket će biti generisan kada admin zaključa turnir."
                    : "Nema mečeva za ovaj turnir."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Members Modal */}
      {membersModal && (
        <TeamMembersModal
          teamId={membersModal.teamId}
          teamName={membersModal.teamName}
          token={token ?? ""}
          gameId={tournament.gameId}
          currentUserId={user?.id}
          onClose={() => setMembersModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Team Members Modal ─── */

interface UserBasic { id: number; gamerTag: string; fullName: string; }

function TeamMembersModal({ teamId, teamName, token, gameId, currentUserId, onClose }: {
  teamId: number;
  teamName: string;
  token: string;
  gameId?: number;
  currentUserId?: number;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(0);

  // Invite state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [confirmMember, setConfirmMember] = useState<TeamMemberInfo | null>(null);
  const [removing, setRemoving] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, gameRes] = await Promise.all([
          fetch(`${BASE}teams/${teamId}/members`, { headers: authHeader }),
          gameId ? fetch(`${BASE}games/${gameId}`) : Promise.resolve(null),
        ]);
        const membersData = await membersRes.json();
        if (membersData.success) setMembers(membersData.data as TeamMemberInfo[]);
        else setError("Neuspešno učitavanje članova");

        if (gameRes) {
          const gameData = await gameRes.json();
          if (gameData.success && gameData.data?.maxPlayers) {
            setMaxPlayers(gameData.data.maxPlayers as number);
          }
        }
      } catch {
        setError("Greška pri učitavanju");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [teamId, token, gameId]);

  const captain = members.find(m => m.role === "captain");
  const others = members.filter(m => m.role !== "captain");
  const isCaptain = currentUserId !== undefined && captain?.playerId === currentUserId;

  const confirmRemove = async () => {
    if (!confirmMember) return;
    setRemoving(true);
    try {
      await fetch(`${BASE}teams/${teamId}/members/${confirmMember.playerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(prev => prev.filter(m => m.playerId !== confirmMember.playerId));
      setConfirmMember(null);
    } catch {
      setError("Greška pri uklanjanju člana");
    } finally {
      setRemoving(false);
    }
  };
  const isFull = maxPlayers > 0 && members.length >= maxPlayers;

  const openInvite = async () => {
    setInviteOpen(true);
    setInviteError("");
    setInviteSuccess("");
    setUsersLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch(`${BASE}players`, { headers: authHeader }),
        fetch(`${BASE}teams/${teamId}/invites/pending`, { headers: authHeader }),
      ];
      // Uvek re-fetch maxPlayers da bismo imali aktuelno stanje
      if (gameId) requests.push(fetch(`${BASE}games/${gameId}`));
      const [playersRes, pendingRes, gameRes] = await Promise.all(requests);
      const playersData = await playersRes.json();
      const pendingData = await pendingRes.json();

      const memberIds = new Set(members.map(m => m.playerId));
      const filtered = (playersData.data ?? []) as UserBasic[];
      setAllUsers(filtered.filter((u: UserBasic) => !memberIds.has(u.id)));

      if (pendingData.success && Array.isArray(pendingData.data)) {
        const alreadyInvited = new Set<number>(
          (pendingData.data as { inviteeId: number }[]).map(i => i.inviteeId)
        );
        setInvitedIds(alreadyInvited);
      }

      // Osveži maxPlayers
      if (gameRes) {
        const gameData = await gameRes.json() as { success: boolean; data?: { maxPlayers?: number } };
        if (gameData.success && gameData.data?.maxPlayers) {
          setMaxPlayers(gameData.data.maxPlayers);
        }
      }
    } catch {
      setInviteError("Greška pri učitavanju korisnika");
    } finally {
      setUsersLoading(false);
    }
  };

  const sendInvite = async (inviteeId: number) => {
    if (isFull) { setInviteError("Tim je popunjen, ne možeš pozvati više igrača."); return; }
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(`${BASE}teams/${teamId}/invite`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeId }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteSuccess("Pozivnica poslata!");
        setSearch("");
        setInvitedIds(prev => new Set(prev).add(inviteeId));
      } else {
        // Ako pozivnica već postoji — označi kao pozvana umjesto greške
        if ((data.message as string | undefined)?.toLowerCase().includes("već postoji") ||
            (data.message as string | undefined)?.toLowerCase().includes("vec postoji")) {
          setInvitedIds(prev => new Set(prev).add(inviteeId));
        } else {
          setInviteError(data.message ?? "Greška pri slanju pozivnice");
        }
      }
    } catch {
      setInviteError("Greška pri slanju pozivnice");
    } finally {
      setInviting(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.gamerTag.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6);

  return createPortal(
    <>
    {/* Confirm removal modal */}
    <AnimatePresence>
      {confirmMember && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="pg-glass"
            style={{ width: "100%", maxWidth: 360, borderRadius: 16, padding: 28, border: "1px solid var(--border-bright)", textAlign: "center" }}>
            <p style={{ fontSize: 28, marginBottom: 14 }}>⚠️</p>
            <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              Izbaci igrača
            </p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              Da li želiš da izbacis <strong style={{ color: "var(--text)" }}>{confirmMember.gamerTag}</strong> iz tima <strong style={{ color: "var(--text)" }}>{teamName}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <PgBtn variant="ghost" onClick={() => setConfirmMember(null)} disabled={removing}>Otkaži</PgBtn>
              <PgBtn variant="danger" onClick={() => void confirmRemove()} disabled={removing}>
                {removing ? "Uklanjanje..." : "Da, izbaci"}
              </PgBtn>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="pg-glass"
          style={{ width: "100%", maxWidth: 440, borderRadius: 18, padding: 28, border: "1px solid var(--border-bright)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                Članovi tima {maxPlayers > 0 && <span style={{ color: isFull ? "var(--pink)" : "var(--green)" }}>· {members.length}/{maxPlayers}</span>}
              </p>
              <p style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{teamName}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}><Spinner /></div>
          ) : error ? (
            <ErrorBox message={error} />
          ) : members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Nema članova.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {captain && <MemberRow member={captain} />}
              {others.map(m => (
                <MemberRow
                  key={m.playerId}
                  member={m}
                  onRemove={isCaptain ? () => setConfirmMember(m) : undefined}
                />
              ))}
            </div>
          )}

          {/* Invite section — only for captain */}
          {!loading && isCaptain && (
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {!inviteOpen ? (
                <button
                  disabled={isFull}
                  onClick={openInvite}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 10, cursor: isFull ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                    border: `1px solid ${isFull ? "var(--border)" : "var(--violet)"}`,
                    background: isFull ? "rgba(255,255,255,0.02)" : "rgba(124,92,255,0.10)",
                    color: isFull ? "var(--text-dim)" : "var(--violet2)",
                    opacity: isFull ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  title={isFull ? "Tim je popunjen" : "Pošalji pozivnicu igraču"}
                >
                  {isFull ? "🔒 Tim je popunjen" : "✉ Pošalji pozivnicu"}
                </button>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet2)" }}>Pozovi igrača</p>
                    <button onClick={() => { setInviteOpen(false); setSearch(""); setInviteError(""); setInviteSuccess(""); }}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>

                  {inviteSuccess && <SuccessBox message={inviteSuccess} />}
                  {inviteError && <ErrorBox message={inviteError} />}

                  <input
                    className="pg-input"
                    placeholder="Traži po gamertagu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
                    autoFocus
                  />

                  {isFull && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,45,126,0.08)", border: "1px solid rgba(255,45,126,0.28)", marginBottom: 8 }}>
                      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--pink)", textAlign: "center" }}>🔒 Tim je popunjen ({members.length}/{maxPlayers})</p>
                    </div>
                  )}
                  {usersLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner size={24} /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                      {search ? "Nema rezultata." : "Nema dostupnih igrača."}
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {filteredUsers.map(u => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{u.gamerTag}</p>
                            {u.fullName && <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>{u.fullName}</p>}
                          </div>
                          {invitedIds.has(u.id) ? (
                            <span style={{
                              fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                              padding: "4px 12px", borderRadius: 7,
                              border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)", color: "var(--text-dim)",
                            }}>
                              Pozvan
                            </span>
                          ) : (
                            <button
                              disabled={inviting || isFull}
                              onClick={() => void sendInvite(u.id)}
                              style={{
                                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                                padding: "4px 12px", borderRadius: 7, cursor: (inviting || isFull) ? "not-allowed" : "pointer",
                                border: `1px solid ${isFull ? "var(--border)" : "var(--cyan)"}`,
                                background: isFull ? "rgba(255,255,255,0.03)" : "rgba(0,229,255,0.10)",
                                color: isFull ? "var(--text-dim)" : "var(--cyan)",
                                opacity: (inviting || isFull) ? 0.5 : 1, transition: "opacity 0.2s",
                              }}>
                              Pozovi
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>,
    document.body
  );
}

function MemberRow({ member, onRemove }: { member: TeamMemberInfo; onRemove?: () => void }) {
  const isCaptain = member.role === "captain";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: isCaptain ? "rgba(124,92,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${isCaptain ? "rgba(124,92,255,0.25)" : "var(--border)"}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: isCaptain ? "rgba(124,92,255,0.18)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>{isCaptain ? "👑" : "🎮"}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{member.gamerTag}</p>
        {member.fullName && <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)" }}>{member.fullName}</p>}
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isCaptain ? "var(--violet)" : "var(--text-dim)", background: isCaptain ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>
        {isCaptain ? "kapiten" : "član"}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          title="Izbaci iz tima"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 16, lineHeight: 1, padding: "2px 4px", borderRadius: 4, transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--pink)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function MatchCard({ match, isAdmin, token, tournamentId, onRefresh }: {
  match: Match;
  isAdmin: boolean;
  token: string;
  tournamentId: string;
  onRefresh: () => void;
}) {
  const won1 = match.winnerTeamId !== null && match.winnerTeamId === match.team1Id;
  const won2 = match.winnerTeamId !== null && match.winnerTeamId === match.team2Id;
  const parts = match.score?.split(":") ?? ["0", "0"];
  const s1 = parts[0] ?? "0";
  const s2 = parts[1] ?? "0";
  const accentColor = match.status === "completed" ? "var(--green)" : match.status === "ongoing" ? "var(--cyan)" : "var(--border)";

  const [showResult, setShowResult] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="pg-glass" style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${accentColor}44` }}>
        <div style={{ height: 3, background: accentColor, opacity: match.status === "scheduled" ? 0.3 : 1 }} />
        <div style={{ padding: "10px 14px" }}>
          <TeamRow name={match.team1Name} score={s1} won={won1} bye={match.team1Id === null} />
          <div style={{ height: 1, background: "var(--border)", margin: "6px 0", opacity: 0.4 }} />
          <TeamRow name={match.team2Name} score={s2} won={won2} bye={match.team2Id === null} />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-dim)" }}>#{match.gameId}</span>
              {match.scheduledTime && (
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-muted)" }}>
                  {new Date(match.scheduledTime).toLocaleString("sr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MatchStatusBadge status={match.status} />
              {isAdmin && (
                <>
                  <button onClick={() => setShowSchedule(true)}
                    style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, border: "1px solid var(--gold)", background: "rgba(255,200,0,0.08)", color: "var(--gold)", cursor: "pointer", letterSpacing: "0.05em" }}>
                    🕐
                  </button>
                  <button onClick={() => setShowResult(true)}
                    style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, border: "1px solid var(--cyan)", background: "rgba(0,212,255,0.08)", color: "var(--cyan)", cursor: "pointer", letterSpacing: "0.05em" }}>
                    ✎
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {showResult && (
        <EditResultModal
          match={match}
          token={token}
          onClose={() => setShowResult(false)}
          onSaved={() => { setShowResult(false); onRefresh(); }}
        />
      )}
      {showSchedule && (
        <SetScheduleModal
          match={match}
          token={token}
          onClose={() => setShowSchedule(false)}
          onSaved={() => { setShowSchedule(false); onRefresh(); }}
        />
      )}
    </>
  );
}

/* ─── Edit Result Modal ─── */

function EditResultModal({ match, token, onClose, onSaved }: {
  match: Match; token: string; onClose: () => void; onSaved: () => void;
}) {
  const BASE = import.meta.env.VITE_API_URL;
  const [score1, setScore1] = useState(match.score?.split(":")[0] ?? "0");
  const [score2, setScore2] = useState(match.score?.split(":")[1] ?? "0");
  const [status, setStatus] = useState(match.status);
  const [winner, setWinner] = useState<number | null>(match.winnerTeamId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${BASE}matches/${match.gameId}/result`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ score: `${score1}:${score2}`, winnerTeamId: winner, status }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.message ?? "Greška");
    } catch { setError("Greška pri čuvanju"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        className="pg-glass" style={{ width: "100%", maxWidth: 380, borderRadius: 16, padding: 24, border: "1px solid var(--border-bright)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Izmeni rezultat #{match.gameId}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {error && <p style={{ fontSize: 12, color: "var(--pink)", marginBottom: 12 }}>{error}</p>}

        {/* Score */}
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Rezultat</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{match.team1Name ?? "Tim 1"}</p>
            <input type="number" min={0} value={score1} onChange={(e) => setScore1(e.target.value)}
              className="pg-input" style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900 }} />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--text-dim)" }}>:</span>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{match.team2Name ?? "Tim 2"}</p>
            <input type="number" min={0} value={score2} onChange={(e) => setScore2(e.target.value)}
              className="pg-input" style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900 }} />
          </div>
        </div>

        {/* Status */}
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Status</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["scheduled", "in_progress", "completed"].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "6px 0", borderRadius: 7, border: `1px solid ${status === s ? "var(--cyan)" : "var(--border)"}`, background: status === s ? "rgba(0,212,255,0.12)" : "transparent", color: status === s ? "var(--cyan)" : "var(--text-muted)", cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>

        {/* Winner */}
        {(match.team1Id || match.team2Id) && (
          <>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Pobednik</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[{ id: match.team1Id, name: match.team1Name }, { id: match.team2Id, name: match.team2Name }].filter(t => t.id).map((t) => (
                <button key={t.id} onClick={() => setWinner(winner === t.id ? null : t.id!)}
                  style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 12, fontWeight: 700, padding: "7px 0", borderRadius: 7, border: `1px solid ${winner === t.id ? "var(--green)" : "var(--border)"}`, background: winner === t.id ? "rgba(0,255,136,0.1)" : "transparent", color: winner === t.id ? "var(--green)" : "var(--text-muted)", cursor: "pointer" }}>
                  {winner === t.id ? "🏆 " : ""}{t.name ?? `Tim ${t.id}`}
                </button>
              ))}
            </div>
          </>
        )}

        <PgBtn variant="cyan" full disabled={saving} onClick={save}>{saving ? "Čuvanje..." : "Sačuvaj"}</PgBtn>
      </motion.div>
    </div>,
    document.body
  );
}

/* ─── Set Schedule Modal ─── */

function SetScheduleModal({ match, token, onClose, onSaved }: {
  match: Match; token: string; onClose: () => void; onSaved: () => void;
}) {
  const BASE = import.meta.env.VITE_API_URL;
  const inputRef = useRef<HTMLInputElement>(null);

  // Format existing scheduled time for datetime-local input (YYYY-MM-DDTHH:mm)
  const toInputValue = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [value, setValue] = useState(toInputValue(match.scheduledTime));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${BASE}matches/${match.gameId}/schedule`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledTime: value ? new Date(value).toISOString() : null }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.message ?? "Greška");
    } catch { setError("Greška pri čuvanju"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        className="pg-glass" style={{ width: "100%", maxWidth: 340, borderRadius: 16, padding: 24, border: "1px solid var(--border-bright)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Vreme meča #{match.gameId}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{match.team1Name ?? "Tim 1"} vs {match.team2Name ?? "Tim 2"}</p>

        {error && <p style={{ fontSize: 12, color: "var(--pink)", marginBottom: 12 }}>{error}</p>}

        <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Datum i vreme</p>
        <input ref={inputRef} type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)}
          className="pg-input" style={{ width: "100%", marginBottom: 20, colorScheme: "dark" }} />

        <div style={{ display: "flex", gap: 10 }}>
          <PgBtn variant="cyan" full disabled={saving} onClick={save}>{saving ? "Čuvanje..." : "Sačuvaj"}</PgBtn>
          {value && <PgBtn variant="ghost" onClick={() => setValue("")}>Obriši</PgBtn>}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function TeamRow({ name, score, won, bye }: { name: string | null; score: string; won: boolean; bye: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <span style={{ fontSize: 10, minWidth: 14 }}>{won ? "🏆" : ""}</span>
      <span style={{ flex: 1, fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 600, color: bye ? "var(--text-dim)" : won ? "var(--text)" : "var(--text-soft)", fontStyle: bye ? "italic" : "normal" }}>
        {bye ? "BYE" : (name ?? "TBD")}
      </span>
      {!bye && <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: won ? "var(--green)" : "var(--text-dim)", minWidth: 20, textAlign: "right" }}>{score}</span>}
    </div>
  );
}

function SectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--violet2)", background: "rgba(124,92,255,0.12)", padding: "2px 8px", borderRadius: 20 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent)" }} />
    </div>
  );
}

function TeamStatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    pending:      { c: "var(--gold)",  label: "pending" },
    confirmed:    { c: "var(--green)", label: "confirmed" },
    disqualified: { c: "var(--pink)",  label: "dq" },
  };
  const s = map[status] ?? { c: "var(--text-muted)", label: status };
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: s.c, background: `${s.c}18`, padding: "2px 8px", borderRadius: 6 }}>{s.label}</span>;
}

function MatchStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { scheduled: "var(--text-dim)", ongoing: "var(--cyan)", completed: "var(--green)" };
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: map[status] ?? "var(--text-dim)" }}>{status}</span>;
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Polufinale";
  if (fromEnd === 2) return "Cetvrtfinale";
  return `Runda ${round}`;
}
