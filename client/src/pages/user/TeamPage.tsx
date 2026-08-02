import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn, TiltCard, FormField } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";
import { parseData } from "../../helpers/api";

interface Team {
  teamId: number;
  teamName: string;
  tag: string;
  logo: string;
  description: string | null;
}

interface TeamMemberInfo {
  playerId: number;
  gamerTag: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

const BASE = import.meta.env.VITE_API_URL;
const GLOWS = ["var(--violet)", "var(--cyan)", "var(--pink)", "var(--green)", "var(--gold)"];

export default function TeamsPage() {
  const { token, user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ teamName: "", tag: "", logo: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [membersModal, setMembersModal] = useState<{ teamId: number; teamName: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}teams`, { headers });
      const data = await res.json();
      setTeams(parseData<Team>(data));
    } catch {
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, [token]);

  const createTeam = async () => {
    if (!form.teamName || !form.tag) return;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}teams`, { method: "POST", headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ teamName: "", tag: "", logo: "", description: "" });
        // Read-after-write: upis ide na master, a lista cita sa slave-a koji
        // mozda jos nije replicirao. Zato odmah ubacimo vraceni tim u stanje,
        // umesto da re-fetchujemo sa potencijalno zaostalog slave-a.
        const createdTeam = data.data as Team | undefined;
        if (createdTeam && createdTeam.teamId) {
          setTeams((prev) => prev.some((t) => t.teamId === createdTeam.teamId) ? prev : [...prev, createdTeam]);
        } else {
          await loadTeams();
        }
      } else setError(data.message);
    } catch {
      setError("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Squads" title="My teams"
        action={<PgBtn variant="primary" onClick={() => setShowCreate((v) => !v)}>+ New team</PgBtn>} />

      {error && <ErrorBox message={error} />}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 24 }}>
            <div className="pg-glass" style={{ padding: 26, border: "1px solid var(--border-bright)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text)", marginBottom: 20 }}>CREATE TEAM</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <FormField label="Team name *">
                  <input placeholder="Dragon Force" value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} className="pg-input" />
                </FormField>
                <FormField label="Tag (2-6) *">
                  <input placeholder="DF" maxLength={6} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ marginBottom: 14 }}>
                <FormField label="Logo URL (optional)">
                  <input placeholder="https://..." value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ marginBottom: 20 }}>
                <FormField label="Description (optional)">
                  <input placeholder="Short team description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="pg-input" />
                </FormField>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <PgBtn variant="primary" onClick={createTeam} disabled={creating}>{creating ? "Creating..." : "Create"}</PgBtn>
                <PgBtn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</PgBtn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? <Spinner /> : teams.length === 0 ? <Empty message="You don't have any teams yet. Create one!" /> : (
        <motion.div variants={staggerContainer(0.07)} initial="hidden" animate="show"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {teams.map((t, i) => {
            const glow = GLOWS[i % GLOWS.length];
            return (
              <motion.div key={t.teamId} variants={fadeUp}
                onClick={() => setMembersModal({ teamId: t.teamId, teamName: t.teamName })}
                style={{ cursor: "pointer" }}
                title="Click for member details">
                <TiltCard glow={glow} style={{ padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 12, background: `${glow}1a`, border: `1px solid ${glow}45`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", boxShadow: `0 0 18px ${glow}30` }}>
                      {t.logo
                        ? <img src={t.logo} alt={t.tag} style={{ width: 54, height: 54, objectFit: "cover" }} />
                        : <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 900, color: glow }}>{t.tag?.slice(0, 2)}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{t.teamName}</p>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: glow }}>[{t.tag}]</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, minHeight: 38 }}>{t.description || "Nema opisa."}</p>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: glow, marginTop: 12, opacity: 0.7 }}>VIEW MEMBERS →</p>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {membersModal && (
        <TeamMembersModal
          teamId={membersModal.teamId}
          teamName={membersModal.teamName}
          token={token ?? ""}
          currentUserId={user?.id}
          onClose={() => setMembersModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Team Members Modal ─── */

interface UserBasic { id: number; gamerTag: string; fullName: string; }

function TeamMembersModal({ teamId, teamName, token, currentUserId, onClose }: {
  teamId: number;
  teamName: string;
  token: string;
  currentUserId?: number;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${BASE}teams/${teamId}/members`, { headers: authHeader });
        const data = await res.json();
        if (data.success) setMembers(data.data as TeamMemberInfo[]);
        else setError("Failed to load members");
      } catch {
        setError("Failed to load");
      } finally {
        setLoading(false);
      }
    };
    void fetchMembers();
  }, [teamId, token]);

  const captain = members.find(m => m.role === "captain");
  const others = members.filter(m => m.role !== "captain");
  const isCaptain = currentUserId !== undefined && captain?.playerId === currentUserId;
  const canLeave = currentUserId !== undefined && !isCaptain && members.some(m => m.playerId === currentUserId);

  const leaveTeam = async () => {
    setLeaving(true);
    try {
      await fetch(`${BASE}teams/${teamId}/members/${currentUserId!}`, {
        method: "DELETE",
        headers: authHeader,
      });
      onClose();
    } catch {
      setError("Failed to leave team");
    } finally {
      setLeaving(false);
      setLeaveConfirm(false);
    }
  };

  const confirmRemove = async () => {
    if (!confirmMember) return;
    setRemoving(true);
    try {
      await fetch(`${BASE}teams/${teamId}/members/${confirmMember.playerId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      setMembers(prev => prev.filter(m => m.playerId !== confirmMember.playerId));
      setConfirmMember(null);
    } catch {
      setError("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const openInvite = async () => {
    setInviteOpen(true);
    setInviteError("");
    setInviteSuccess("");
    if (allUsers.length > 0) return;
    setUsersLoading(true);
    try {
      const [playersRes, pendingRes] = await Promise.all([
        fetch(`${BASE}players`, { headers: authHeader }),
        fetch(`${BASE}teams/${teamId}/invites/pending`, { headers: authHeader }),
      ]);
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
    } catch {
      setInviteError("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const sendInvite = async (inviteeId: number) => {
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
        if ((data.message as string | undefined)?.toLowerCase().includes("already")) {
          setInvitedIds(prev => new Set(prev).add(inviteeId));
        } else {
          setInviteError(data.message ?? "Failed to send invite");
        }
      }
    } catch {
      setInviteError("Failed to send invite");
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
              Kick player
            </p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              Do you want to kick <strong style={{ color: "var(--text)" }}>{confirmMember.gamerTag}</strong> from the team <strong style={{ color: "var(--text)" }}>{teamName}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <PgBtn variant="ghost" onClick={() => setConfirmMember(null)} disabled={removing}>Cancel</PgBtn>
              <PgBtn variant="danger" onClick={() => void confirmRemove()} disabled={removing}>
                {removing ? "Removing..." : "Yes, kick"}
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Team members</p>
              <p style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{teamName}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}><Spinner /></div>
          ) : error ? (
            <ErrorBox message={error} />
          ) : members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No members.</p>
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

          {/* Invite section — samo za kapitena */}
          {!loading && isCaptain && (
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {!inviteOpen ? (
                <button
                  onClick={openInvite}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer",
                    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                    border: "1px solid var(--violet)", background: "rgba(124,92,255,0.10)", color: "var(--violet2)",
                    transition: "all 0.2s",
                  }}
                >
                  ✉ Send invite
                </button>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--violet2)" }}>Invite a player</p>
                    <button onClick={() => { setInviteOpen(false); setSearch(""); setInviteError(""); setInviteSuccess(""); }}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>

                  {inviteSuccess && <SuccessBox message={inviteSuccess} />}
                  {inviteError && <ErrorBox message={inviteError} />}

                  <input
                    className="pg-input"
                    placeholder="Search by gamertag..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
                    autoFocus
                  />

                  {usersLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner size={24} /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                      {search ? "No results." : "No available players."}
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
                              Invited
                            </span>
                          ) : (
                            <button
                              disabled={inviting}
                              onClick={() => void sendInvite(u.id)}
                              style={{
                                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                                padding: "4px 12px", borderRadius: 7, cursor: inviting ? "not-allowed" : "pointer",
                                border: "1px solid var(--cyan)", background: "rgba(0,229,255,0.10)", color: "var(--cyan)",
                                opacity: inviting ? 0.5 : 1, transition: "opacity 0.2s",
                              }}>
                              Invite
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

          {/* Leave team — samo za ne-kapitene koji su članovi */}
          {!loading && canLeave && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button
                onClick={() => setLeaveConfirm(true)}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 10, cursor: "pointer",
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                  border: "1px solid rgba(255,45,126,0.4)", background: "rgba(255,45,126,0.07)", color: "var(--pink)",
                  transition: "all 0.2s",
                }}>
                🚪 Leave team
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {/* Leave confirm modal */}
    <AnimatePresence>
      {leaveConfirm && (
        <motion.div
          key="leave-overlay"
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
            <p style={{ fontSize: 28, marginBottom: 14 }}>🚪</p>
            <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              Leave team
            </p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              Do you want to leave the team <strong style={{ color: "var(--text)" }}>{teamName}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <PgBtn variant="ghost" onClick={() => setLeaveConfirm(false)} disabled={leaving}>Cancel</PgBtn>
              <PgBtn variant="danger" onClick={() => void leaveTeam()} disabled={leaving}>
                {leaving ? "Leaving..." : "Yes, leave"}
              </PgBtn>
            </div>
          </motion.div>
        </motion.div>
      )}
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
        {isCaptain ? "captain" : "member"}
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
