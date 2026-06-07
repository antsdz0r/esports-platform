import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { PageHeader, Spinner, Empty, ErrorBox, SuccessBox, PgBtn } from "../../components/ui/UI";
import { fadeUp, staggerContainer } from "../../components/ui/motion";

interface TeamInvite {
  id: number;
  teamId: number;
  inviterId: number;
  inviteeId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

interface InviteWithTeam extends TeamInvite {
  teamName: string;
  teamTag: string;
  teamLogo: string;
}

const BASE = import.meta.env.VITE_API_URL;

const GLOW_COLORS = {
  pending:  "var(--gold)",
  accepted: "var(--green)",
  declined: "var(--pink)",
};

const STATUS_LABELS = {
  pending:  "Na čekanju",
  accepted: "Prihvaćena",
  declined: "Odbijena",
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:  { background: "rgba(255,196,68,0.12)", color: "var(--gold)",  border: "1px solid rgba(255,196,68,0.30)" },
  accepted: { background: "rgba(0,240,160,0.10)",  color: "var(--green)", border: "1px solid rgba(0,240,160,0.28)" },
  declined: { background: "rgba(255,45,126,0.10)", color: "var(--pink)",  border: "1px solid rgba(255,45,126,0.28)" },
};

export default function InvitesPage() {
  const { token } = useAuth();
  const [invites, setInvites]   = useState<InviteWithTeam[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [responding, setResponding] = useState<number | null>(null);
  const [filter, setFilter]     = useState<"all" | "pending" | "accepted" | "declined">("all");

  const loadInvites = useCallback(async () => {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${BASE}teams/invites/my`, { headers });
      const data = await res.json() as { success: boolean; data?: TeamInvite[]; message?: string };

      if (!data.success) {
        setError(data.message ?? "Greška pri učitavanju pozivnica");
        return;
      }

      const raw: TeamInvite[] = data.data ?? [];

      // Fetch team info for each unique teamId in parallel
      const uniqueTeamIds = [...new Set(raw.map((i) => i.teamId))];
      const teamMap = new Map<number, { teamName: string; tag: string; logo: string }>();

      await Promise.all(
        uniqueTeamIds.map(async (id) => {
          try {
            const tr   = await fetch(`${BASE}teams/${id}`);
            const td   = await tr.json() as { success: boolean; data?: { teamName: string; tag: string; logo: string } };
            if (td.success && td.data) teamMap.set(id, td.data);
          } catch {
            teamMap.set(id, { teamName: `Tim #${id}`, tag: "?", logo: "" });
          }
        })
      );

      const enriched: InviteWithTeam[] = raw.map((inv) => {
        const t = teamMap.get(inv.teamId) ?? { teamName: `Tim #${inv.teamId}`, tag: "?", logo: "" };
        return { ...inv, teamName: t.teamName, teamTag: t.tag, teamLogo: t.logo };
      });

      // Newest first, pending on top
      enriched.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return  1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setInvites(enriched);
    } catch {
      setError("Neuspešno učitavanje pozivnica");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadInvites(); }, [loadInvites]);

  const respond = async (inviteId: number, accept: boolean) => {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    setResponding(inviteId);
    setError("");
    setSuccess("");
    try {
      const inv = invites.find((i) => i.id === inviteId);
      const res  = await fetch(`${BASE}teams/${inv!.teamId}/invite/respond`, {
        method: "POST",
        headers,
        body: JSON.stringify({ inviteId, accept }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (data.success) {
        setSuccess(data.message ?? (accept ? "Pozivnica prihvaćena!" : "Pozivnica odbijena."));
        if (!accept) {
          // Odmah ukloni odbijenu pozivnicu iz liste
          setInvites(prev => prev.filter(i => i.id !== inviteId));
        } else {
          // Za prihvatanje — osveži da se vidi novi status
          await loadInvites();
        }
      } else {
        setError(data.message ?? "Greška");
      }
    } catch {
      setError("Greška pri odgovaranju na pozivnicu");
    } finally {
      setResponding(null);
    }
  };

  const filtered = filter === "all" ? invites : invites.filter((i) => i.status === filter);
  const pendingCount = invites.filter((i) => i.status === "pending").length;

  return (
    <div>
      <PageHeader
        eyebrow="Timovi"
        title="Pozivnice"
        action={
          pendingCount > 0 ? (
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--gold)", background: "rgba(255,196,68,0.12)", border: "1px solid rgba(255,196,68,0.30)", borderRadius: 20, padding: "4px 14px", letterSpacing: "0.06em" }}>
              {pendingCount} na čekanju
            </span>
          ) : undefined
        }
      />

      {error   && <ErrorBox   message={error}   />}
      {success && <SuccessBox message={success} />}

      {/* Filter tabs */}
      {!loading && invites.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {(["all", "pending", "accepted", "declined"] as const).map((f) => {
            const count = f === "all" ? invites.length : invites.filter((i) => i.status === f).length;
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  border: active ? "1px solid var(--violet)" : "1px solid var(--border)",
                  background: active ? "rgba(124,92,255,0.15)" : "rgba(255,255,255,0.03)",
                  color: active ? "var(--violet2)" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                {f === "all" ? "Sve" : STATUS_LABELS[f]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty message={filter === "all" ? "Nema pozivnica." : `Nema ${STATUS_LABELS[filter as keyof typeof STATUS_LABELS]?.toLowerCase()} pozivnica.`} />
      ) : (
        <motion.div
          variants={staggerContainer(0.07)}
          initial="hidden"
          animate="show"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <AnimatePresence>
            {filtered.map((inv) => (
              <InviteCard
                key={inv.id}
                invite={inv}
                responding={responding}
                onRespond={respond}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

/* ── Invite Card ── */

function InviteCard({
  invite,
  responding,
  onRespond,
}: {
  invite: InviteWithTeam;
  responding: number | null;
  onRespond: (id: number, accept: boolean) => void;
}) {
  const glow = GLOW_COLORS[invite.status];
  const statusStyle = STATUS_STYLES[invite.status];
  const isPending = invite.status === "pending";
  const isProcessing = responding === invite.id;

  const date = new Date(invite.createdAt).toLocaleDateString("sr-Latn", {
    day:   "2-digit",
    month: "long",
    year:  "numeric",
  });

  return (
    <motion.div variants={fadeUp} layout exit={{ opacity: 0, scale: 0.96 }}>
      <div
        className="pg-glass"
        style={{
          padding: "20px 24px",
          border: `1px solid ${isPending ? "rgba(255,196,68,0.22)" : "var(--border)"}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
          transition: "border-color 0.3s",
          boxShadow: isPending ? `0 0 24px rgba(255,196,68,0.07)` : "none",
        }}
      >
        {/* Team avatar */}
        <div
          style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `${glow}18`, border: `1px solid ${glow}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", boxShadow: `0 0 16px ${glow}28`,
          }}
        >
          {invite.teamLogo
            ? <img src={invite.teamLogo} alt={invite.teamTag} style={{ width: 52, height: 52, objectFit: "cover" }} />
            : <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 900, color: glow }}>{invite.teamTag?.slice(0, 2)}</span>}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {invite.teamName}
          </p>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Pozvani ste da se pridružite timu · {date}
          </p>
        </div>

        {/* Status badge */}
        <span
          style={{
            fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "4px 12px", borderRadius: 20, flexShrink: 0,
            ...statusStyle,
          }}
        >
          {invite.status === "pending"  && "⏳ "}
          {invite.status === "accepted" && "✓ "}
          {invite.status === "declined" && "✕ "}
          {STATUS_LABELS[invite.status]}
        </span>

        {/* Action buttons */}
        {isPending && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <PgBtn
              variant="cyan"
              size="sm"
              disabled={isProcessing || responding !== null}
              onClick={() => onRespond(invite.id, true)}
            >
              {isProcessing ? "..." : "Prihvati"}
            </PgBtn>
            <PgBtn
              variant="danger"
              size="sm"
              disabled={isProcessing || responding !== null}
              onClick={() => onRespond(invite.id, false)}
            >
              {isProcessing ? "..." : "Odbij"}
            </PgBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}
