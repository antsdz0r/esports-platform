import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { StatCard, Counter, TiltCard, PgBtn, StatusBadge, Spinner, ErrorBox } from "../../components/ui/UI";
import { fadeUp, staggerContainer, fadeInView, slideInView } from "../../components/ui/motion";
import { parseData, parseItem } from "../../helpers/api";

const BASE = import.meta.env.VITE_API_URL;
const STATIC_BASE = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

const IMG = {
  hero2: "https://www.riotgames.com/darkroom/1440/a4e88f6b04bf83f1c417e87292b85606:b62ff9b783f3dd26a6321e1440efe13b/riot-games-the-team-behind-worlds-2022-esports-broadcast-league-of-legends.png",
  hero1: "https://www.hotspawn.com/wp-content/uploads/2025/06/ESL-One-Cologne-2016-SK-Gaming-CSGO-Major-Winners.jpg",
  hero3: "https://img.redbull.com/images/c_crop,w_2880,h_1440,x_0,y_215/c_auto,w_1200,h_600/f_auto,q_auto/redbullcom/2019/03/04/05fb881c-e953-48b3-8eab-04602a13d2fe/ence-iem-katowice-2019",
  cs: "https://i.pinimg.com/736x/e8/09/ee/e809eea0c53550f261eb4c1c7652e452.jpg",
  moba: "https://i.pinimg.com/736x/53/e1/0b/53e10b01dc09634d4419fed9d6862e23.jpg",
  fps: "https://i.pinimg.com/736x/60/89/95/608995178e1c50ed475464496ae3a63a.jpg",
  strat: "https://i.pinimg.com/736x/fd/89/2c/fd892c3ac7bf9f520b92c3bcaaa782e2.jpg",
  sport: "https://www.trixo.gg/wp-content/uploads/2024/08/Rocket-League.webp",
  default: "https://i.pinimg.com/736x/60/89/95/608995178e1c50ed475464496ae3a63a.jpg",
};

const GENRE_IMG: Record<string, string> = {
  fps: IMG.fps,
  moba: IMG.moba,
  strategy: IMG.strat,
  sports: IMG.sport,
  "battle royale": IMG.cs,
};

const HERO_SLIDES = [
  { img: IMG.hero1, tags: ["Explore", "Play", "Win"], title: "Play and win", desc: "Level up your esports experience — teams, tournaments and matches on one platform." },
  { img: IMG.hero2, tags: ["Explore", "Compete", "Rank"], title: "Explore tournaments", desc: "Find open tournaments, register your team and follow results live." },
  { img: IMG.hero3, tags: ["Join", "Team", "Dominate"], title: "Join the community", desc: "Invite players, form your squad and jump into the next match." },
];


const overwatch_img = "https://i.pinimg.com/736x/f6/b7/db/f6b7db628dc0e11cb1ba13a9509b2f2a.jpg";
const nba_img = "https://i.pinimg.com/736x/4e/69/01/4e6901cc2b7330b309128fc8552f8fbb.jpg";
const fortnite = "https://i.pinimg.com/1200x/50/65/54/50655437ff81ed9c54b5515a67d730f6.jpg";

// HARDKODOVANE igre koje treba dodati na sajt — zameni `img`, `name` i `info` kasnije.
const UPCOMING_GAMES = [
  { name: "Overwatch", info: "HERO SHOOTER - 5 players", img: overwatch_img },
  { name: "NBA 2K26", info: "BASKETBALL - 1-2 players", img: nba_img },
  { name: "Fortnite", info: "BATTLE ROYALE - 1-4 players", img: fortnite },
];

interface GameCatalog {
  gameId: number;
  name: string;
  tag: string;
  genre: string;
  maxPlayers: number;
  imageUrl: string | null;
}

interface Tournament {
  tournamentId: number;
  gameId: number;
  name: string;
  status: string;
  gameName: string;
  format: string;
  registeredCount: number;
  maxTeams: number;
  imageUrl?: string | null;
}

interface Match {
  gameId: number;
  tournamentId: number;
  team1Id: number | null;
  team2Id: number | null;
  team1Name: string | null;
  team2Name: string | null;
  score: string;
  status: string;
  round: number;
  winnerTeamId: number | null;
  scheduledTime: string | null;
}

interface UpcomingMatch extends Match {
  tournamentName: string;
}

interface Champion {
  tournamentId: number;
  tournamentName: string;
  gameName: string;
  winnerTeamId: number;
  winnerTeamName: string;
  winnerTeamLogo: string;
  score: string;
}

interface DashboardData {
  games: GameCatalog[];
  tournaments: Tournament[];
  teams: { teamId: number }[];
  watchlist: Tournament[];
  wins: number;
  liveTournament: Tournament | null;
  liveMatch: Match | null;
  upcoming: UpcomingMatch[];
  teamLogos: Record<number, string>;
  champions: Champion[];
}

interface Team { teamId: number; teamName: string; tag: string; }
interface MyReg { tournamentId: number; teamId: number; }

const viewOpts = { once: true, margin: "-60px" as const };

function gameImg(genre: string, imageUrl?: string | null) {
  if (imageUrl) return imageUrl.startsWith("http") ? imageUrl : STATIC_BASE + imageUrl;
  return GENRE_IMG[genre.toLowerCase()] ?? IMG.default;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
      <div>
        <p className="pg-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</p>
        <h2 className="pg-glitch" data-text={title} style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,28px)", fontWeight: 900, letterSpacing: "0.04em", color: "var(--text)" }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TeamAvatar({ name, color, size = 38, logo }: { name: string | null | undefined; color: string; size?: number; logo?: string }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?";
  const radius = size * 0.28;
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: `${color}22`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 10px ${color}30`, overflow: "hidden" }}>
      {logo
        ? <img src={logo.startsWith("http") ? logo : STATIC_BASE + logo} alt={name ?? ""} style={{ width: size, height: size, objectFit: "cover" }} />
        : <span style={{ fontFamily: "var(--font-display)", fontSize: size * 0.36, fontWeight: 900, color }}>{initials}</span>}
    </div>
  );
}

function ChampionCard({ champion: c }: { champion: Champion }) {
  const logo = c.winnerTeamLogo
    ? (c.winnerTeamLogo.startsWith("http") ? c.winnerTeamLogo : STATIC_BASE + c.winnerTeamLogo)
    : null;
  const initials = c.winnerTeamName ? c.winnerTeamName.slice(0, 2).toUpperCase() : "?";

  // Konfete koje izleću iz rama kartice. Postavljene uz ivice, lete napolje (dx/dy).
  const cfColors = ["var(--gold)", "var(--pink)", "var(--cyan)", "var(--violet2)", "var(--green)", "#ffd84d"];
  const confetti = [
    // gornja ivica — lete naviše
    { top: "0%",  left: "12%", dx: -28, dy: -70, spin: 540,  dur: 1.15, delay: 0.00 },
    { top: "0%",  left: "30%", dx: 14,  dy: -88, spin: -480, dur: 1.30, delay: 0.18 },
    { top: "0%",  left: "50%", dx: -8,  dy: -96, spin: 620,  dur: 1.05, delay: 0.34 },
    { top: "0%",  left: "68%", dx: 22,  dy: -82, spin: -560, dur: 1.25, delay: 0.10 },
    { top: "0%",  left: "86%", dx: 34,  dy: -66, spin: 500,  dur: 1.20, delay: 0.42 },
    // leva ivica — lete ulevo
    { top: "30%", left: "0%",  dx: -78, dy: -18, spin: -520, dur: 1.28, delay: 0.26 },
    { top: "60%", left: "0%",  dx: -84, dy: 20,  spin: 600,  dur: 1.12, delay: 0.06 },
    // desna ivica — lete udesno
    { top: "32%", left: "100%", dx: 80, dy: -16, spin: 540,  dur: 1.22, delay: 0.38 },
    { top: "62%", left: "100%", dx: 86, dy: 24,  spin: -600, dur: 1.08, delay: 0.14 },
    // donja ivica — lete naniže
    { top: "100%", left: "18%", dx: -22, dy: 74, spin: 580,  dur: 1.18, delay: 0.30 },
    { top: "100%", left: "40%", dx: 10,  dy: 88, spin: -500, dur: 1.32, delay: 0.02 },
    { top: "100%", left: "60%", dx: -14, dy: 80, spin: 640,  dur: 1.10, delay: 0.46 },
    { top: "100%", left: "82%", dx: 26,  dy: 70, spin: -540, dur: 1.24, delay: 0.20 },
  ];

  return (
    <motion.div variants={fadeUp} className="pg-champion" whileHover={{ y: -8, scale: 1.04 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
      <div className="pg-champion__confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <span key={i} className="cf" style={{ top: c.top, left: c.left, background: cfColors[i % cfColors.length], "--dx": `${c.dx}px`, "--dy": `${c.dy}px`, "--spin": `${c.spin}deg`, "--dur": `${c.dur}s`, animationDelay: `${c.delay}s` } as React.CSSProperties} />
        ))}
      </div>
      <div className="pg-champion__inner" style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg, rgba(20,14,40,0.95) 0%, rgba(10,8,20,0.98) 100%)", border: "1px solid rgba(255,200,0,0.25)", boxShadow: "0 0 40px rgba(255,200,0,0.08), inset 0 1px 0 rgba(255,200,0,0.12)", transition: "border-color 0.3s, box-shadow 0.3s" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent, var(--gold), transparent)", opacity: 0.8 }} />
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,200,0,0.12), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", opacity: 0.8, marginBottom: 3 }}>{c.gameName}</p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{c.tournamentName}</p>
            </div>
            <span style={{ fontSize: 28 }}>🏆</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,200,0,0.12)", border: "2px solid rgba(255,200,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", boxShadow: "0 0 20px rgba(255,200,0,0.2)" }}>
              {logo
                ? <img src={logo} alt={c.winnerTeamName} style={{ width: 56, height: 56, objectFit: "cover" }} />
                : <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, color: "var(--gold)" }}>{initials}</span>}
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, color: "var(--gold)", letterSpacing: "0.04em", textShadow: "0 0 20px rgba(255,200,0,0.4)" }}>{c.winnerTeamName}</p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(255,200,0,0.55)", marginTop: 3 }}>Final · {c.score}</p>
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(255,200,0,0.3), transparent)" }} />
      </div>
    </motion.div>
  );
}

function GameCard({ img, title, desc, meta, size = "md" }: { img: string; title: string; desc?: string; meta?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: [200, 240], md: [260, 300], lg: [280, 340] }[size];
  return (
    <div className="pg-game-card" style={{ width: dims[0], height: dims[1] }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img src={img} alt="" className="pg-game-card__img" loading="lazy" />
        <div className="pg-game-card__shade" />
      </div>
      <div className="pg-game-card__body">
        {meta}
        <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: desc ? 6 : 0, lineHeight: 1.25 }}>{title}</p>
        {desc && <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</p>}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    games: [], tournaments: [], teams: [], watchlist: [], wins: 0,
    liveTournament: null, liveMatch: null, upcoming: [], teamLogos: {}, champions: [],
  });

  // Registration state
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [myRegs, setMyRegs] = useState<MyReg[]>([]);
  const [regModal, setRegModal] = useState<Tournament | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [regSaving, setRegSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadRegData = async () => {
    if (!token) return;
    try {
      const [teamsRes, regsRes] = await Promise.all([
        fetch(`${BASE}teams/captain`, { headers }),
        fetch(`${BASE}tournaments/my-registrations`, { headers }),
      ]);
      const teamsData = await teamsRes.json();
      const regsData = await regsRes.json();
      setCaptainTeams(teamsData.success ? (teamsData.data as Team[]) : []);
      setMyRegs(regsData.success ? (regsData.data as MyReg[]) : []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    if (!token) return;
    const hdrs = { Authorization: `Bearer ${token}` };

    const load = async () => {
      setLoading(true);
      try {
        const [gamesRes, tournamentsRes, teamsRes, watchlistRes, winsRes] = await Promise.all([
          fetch(`${BASE}games`),
          fetch(`${BASE}tournaments`),
          fetch(`${BASE}teams`, { headers: hdrs }),
          fetch(`${BASE}tournaments/watchlist/my`, { headers: hdrs }),
          fetch(`${BASE}matches/my/wins`, { headers: hdrs }),
        ]);

        const games = parseData<GameCatalog>(await gamesRes.json());
        const tournaments = parseData<Tournament>(await tournamentsRes.json());
        const teams = parseData<{ teamId: number }>(await teamsRes.json());
        const watchlist = parseData<Tournament>(await watchlistRes.json());
        const winsJson = await winsRes.json();
        const wins = parseItem<{ wins: number }>(winsJson)?.wins ?? 0;

        const liveTournament = tournaments.find((t) => t.status === "ongoing") ?? null;
        let liveMatch: Match | null = null;
        const upcoming: UpcomingMatch[] = [];
        const teamLogos: Record<number, string> = {};

        const activeTournaments = tournaments.filter((t) => t.status === "ongoing" || t.status === "locked");
        const matchesByTournament = await Promise.all(
          activeTournaments.map(async (t) => {
            try {
              const mRes = await fetch(`${BASE}matches/tournament/${t.tournamentId}`);
              const matches = parseData<Match>(await mRes.json());
              return { tournament: t, matches };
            } catch { return { tournament: t, matches: [] }; }
          })
        );

        if (liveTournament) {
          const liveEntry = matchesByTournament.find((e) => e.tournament.tournamentId === liveTournament.tournamentId);
          if (liveEntry) {
            liveMatch = liveEntry.matches.find((m) => m.status === "in_progress" || m.status === "ongoing")
              ?? liveEntry.matches.find((m) => m.status === "completed")
              ?? liveEntry.matches[0] ?? null;
          }
        }

        for (const { tournament, matches } of matchesByTournament) {
          for (const m of matches) {
            if (m.status === "scheduled") {
              upcoming.push({ ...m, tournamentName: tournament.name });
            }
          }
        }

        const allMatchTeamIds = [...new Set(
          matchesByTournament.flatMap((e) => e.matches).flatMap((m) => [m.team1Id, m.team2Id]).filter((id): id is number => id !== null)
        )];
        await Promise.all(allMatchTeamIds.map(async (id) => {
          try {
            const r = await fetch(`${BASE}teams/${id}`);
            const d = await r.json();
            if (d.success && d.data?.logo) teamLogos[id] = d.data.logo as string;
          } catch { /* skip */ }
        }));

        const champions: Champion[] = [];
        const completedTournaments = tournaments.filter((t) => t.status === "completed").slice(-3).reverse();
        await Promise.all(completedTournaments.map(async (t) => {
          try {
            const mRes = await fetch(`${BASE}matches/tournament/${t.tournamentId}`);
            const matches = parseData<Match>(await mRes.json());
            if (matches.length === 0) return;
            const maxRound = Math.max(...matches.map((m) => m.round));
            const final = matches
              .filter((m) => m.round === maxRound && m.status === "completed" && m.winnerTeamId !== null)
              .sort((a, b) => b.gameId - a.gameId)[0];
            if (!final?.winnerTeamId) return;
            const winnerId = final.winnerTeamId;
            const winnerName = winnerId === final.team1Id ? (final.team1Name ?? "") : (final.team2Name ?? "");
            let logo = teamLogos[winnerId] ?? "";
            if (!logo) {
              try {
                const tr = await fetch(`${BASE}teams/${winnerId}`);
                const td = await tr.json();
                if (td.success && td.data?.logo) { logo = td.data.logo as string; teamLogos[winnerId] = logo; }
              } catch { /* skip */ }
            }
            champions.push({ tournamentId: t.tournamentId, tournamentName: t.name, gameName: t.gameName, winnerTeamId: winnerId, winnerTeamName: winnerName, winnerTeamLogo: logo, score: final.score });
          } catch { /* skip */ }
        }));

        setData({ games, tournaments, teams, watchlist, wins, liveTournament, liveMatch, upcoming, teamLogos, champions });
      } catch {
        /* keep empty state */
      } finally {
        setLoading(false);
      }
    };

    void load();
    void loadRegData();
  }, [token]);

  const openRegModal = (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegError("");
    if (captainTeams.length === 0) { setRegError("Nisi kapiten nijednog tima."); return; }
    setSelectedTeamId(captainTeams.length === 1 ? captainTeams[0].teamId : null);
    setRegModal(t);
  };

  const register = async () => {
    if (!regModal || !selectedTeamId) return;
    setRegSaving(true);
    try {
      const res = await fetch(`${BASE}tournaments/${regModal.tournamentId}/register`, {
        method: "POST", headers, body: JSON.stringify({ teamId: selectedTeamId }),
      });
      const d = await res.json();
      if (!res.ok) { setRegError(d.message ?? "Registration failed"); }
      else { setRegModal(null); await loadRegData(); }
    } catch { setRegError("Registration failed"); }
    finally { setRegSaving(false); }
  };

  const cancelReg = async (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    const myReg = myRegs.find(r => r.tournamentId === t.tournamentId);
    if (!myReg) return;
    setCancellingId(t.tournamentId);
    try {
      await fetch(`${BASE}tournaments/${t.tournamentId}/register/${myReg.teamId}`, { method: "DELETE", headers });
      await loadRegData();
    } catch { /* silent */ }
    finally { setCancellingId(null); }
  };

  const actions = [
    { to: "/dashboard/teams", icon: "◎", title: "My teams", desc: "Roster, invites, captaincy.", glow: "var(--violet)" },
    { to: "/dashboard/tournaments", icon: "◈", title: "Tournaments", desc: "Registrations and match schedule.", glow: "var(--cyan)" },
    { to: "/dashboard/invites", icon: "✉", title: "Invites", desc: "Accept or decline invites.", glow: "var(--pink)" },
    { to: "/dashboard/watchlist", icon: "★", title: "Watchlist", desc: "Follow your favorite tournaments.", glow: "var(--gold)" },
  ];

  const [selectedGame, setSelectedGame] = useState<GameCatalog | null>(null);

  const current = HERO_SLIDES[slide];

  const tournamentCountByGame = data.tournaments.reduce<Record<number, number>>((acc, t) => {
    if (t.gameId) acc[t.gameId] = (acc[t.gameId] ?? 0) + 1;
    return acc;
  }, {});
  const activeTournamentCountByGame = data.tournaments.reduce<Record<number, number>>((acc, t) => {
    if (t.gameId && (t.status === "ongoing" || t.status === "open")) acc[t.gameId] = (acc[t.gameId] ?? 0) + 1;
    return acc;
  }, {});
  const sortedGames = [...data.games].sort((a, b) => {
    const total = (tournamentCountByGame[b.gameId] ?? 0) - (tournamentCountByGame[a.gameId] ?? 0);
    if (total !== 0) return total;
    return (activeTournamentCountByGame[b.gameId] ?? 0) - (activeTournamentCountByGame[a.gameId] ?? 0);
  });

  const trending = data.tournaments.filter((t) => t.status === "ongoing" || t.status === "open").slice(0, 4);
  const hasChampions = data.champions.length > 0;

  if (loading) return <Spinner />;

  return (
    <div style={{ paddingBottom: 48 }}>
      <section className="pg-hero" style={{ marginBottom: 32 }}>
        <AnimatePresence mode="wait">
          <motion.div key={slide} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="pg-hero__slide" style={{ backgroundImage: `url(${current.img})` }} />
        </AnimatePresence>
        <div className="pg-hero__overlay" />
        <motion.div className="pg-hero__content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
          <div className="pg-hero__tags">{current.tags.map((tag) => <span key={tag} className="pg-hero__tag">{tag}</span>)}</div>
          <p className="pg-eyebrow" style={{ marginBottom: 14, color: "var(--violet2)" }}>Welcome back, {user?.username}</p>
          <h1 className="pg-glitch" data-text={current.title} style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 16, textShadow: "0 0 40px rgba(124,92,255,0.35)", color: "var(--text)" }}>{current.title}</h1>
          <p style={{ fontSize: 16, color: "var(--text-soft)", lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>{current.desc}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PgBtn variant="primary" onClick={() => navigate("/dashboard/tournaments")}>Explore tournaments</PgBtn>
            <PgBtn variant="ghost" onClick={() => navigate("/dashboard/teams")}>My teams</PgBtn>
          </div>
        </motion.div>
        <div className="pg-hero__dots">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} type="button" aria-label={`Slide ${i + 1}`} className={`pg-hero__dot ${i === slide ? "pg-hero__dot--active" : ""}`} onClick={() => setSlide(i)} />
          ))}
        </div>
      </section>

      <div className="pg-section-pad">
        <motion.div variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewOpts}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
          <motion.div variants={fadeInView} className="pg-glass" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -20, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,126,0.25), transparent 70%)", pointerEvents: "none" }} />
            {data.liveTournament ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <p className="pg-eyebrow" style={{ marginBottom: 8 }}>Live turnir</p>
                    <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700 }}>{data.liveTournament.name}</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{data.liveTournament.gameName} · {data.liveTournament.registeredCount}/{data.liveTournament.maxTeams} teams</p>
                  </div>
                  <StatusBadge status={data.liveTournament.status} />
                </div>
                {data.liveMatch ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "var(--text)", textAlign: "right" }}>{data.liveMatch.team1Name ?? "TBD"}</p>
                      <TeamAvatar name={data.liveMatch.team1Name} color="var(--violet)" logo={data.liveMatch.team1Id ? data.teamLogos[data.liveMatch.team1Id] : undefined} />
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: "var(--cyan)", textShadow: "0 0 20px var(--glow-cyan)", textAlign: "center", whiteSpace: "nowrap" }}>{data.liveMatch.score.replace(":", " : ")}</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10 }}>
                      <TeamAvatar name={data.liveMatch.team2Name} color="var(--pink)" logo={data.liveMatch.team2Id ? data.teamLogos[data.liveMatch.team2Id] : undefined} />
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{data.liveMatch.team2Name ?? "TBD"}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>No active matches.</p>
                )}
                <PgBtn variant="cyan" size="sm" full onClick={() => navigate("/dashboard/tournaments")}>View tournament</PgBtn>
              </>
            ) : (
              <div>
                <p className="pg-eyebrow" style={{ marginBottom: 8 }}>Live tournament</p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>No tournaments in progress right now.</p>
                <PgBtn variant="cyan" size="sm" full onClick={() => navigate("/dashboard/tournaments")}>Browse tournaments</PgBtn>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeInView} className="pg-glass" style={{ padding: 24 }}>
            <p className="pg-eyebrow" style={{ marginBottom: 12 }}>Upcoming matches</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
              {data.upcoming.length > 0 ? data.upcoming.map((m) => (
                <div key={m.gameId} style={{ borderRadius: 8, background: "rgba(124,92,255,0.06)", border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ padding: "4px 10px", borderBottom: "1px solid var(--border)", background: "rgba(124,92,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cyan)", opacity: 0.8 }}>{m.tournamentName} · R{m.round}</span>
                    {m.scheduledTime && (
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--gold)", fontWeight: 600 }}>
                        🕐 {new Date(m.scheduledTime).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })} {new Date(m.scheduledTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textAlign: "right" }}>{m.team1Name ?? "TBD"}</span>
                      <TeamAvatar name={m.team1Name} color="var(--violet)" size={26} logo={m.team1Id ? data.teamLogos[m.team1Id] : undefined} />
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textAlign: "center", padding: "0 4px" }}>vs</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 7 }}>
                      <TeamAvatar name={m.team2Name} color="var(--pink)" size={26} logo={m.team2Id ? data.teamLogos[m.team2Id] : undefined} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{m.team2Name ?? "TBD"}</span>
                    </div>
                  </div>
                </div>
              )) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No scheduled matches.</p>}
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewOpts}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          <motion.div variants={fadeUp}><StatCard label="Role" value={user?.role ?? "player"} color="var(--violet2)" icon="🎮" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Teams" value={<Counter value={data.teams.length} />} color="var(--cyan)" icon="◎" sub="active" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Tournaments" value={<Counter value={data.watchlist.length} />} color="var(--green)" icon="◈" sub="followed" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Wins" value={<Counter value={data.wins} />} color="var(--gold)" icon="🏆" sub="total" /></motion.div>
        </motion.div>

        {sortedGames.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="Popular" title="Games in the catalog" />
            <div style={{ overflow: "hidden", marginBottom: 16, maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
              <div className="pg-marquee">
                {[...sortedGames, ...sortedGames].map((g, i) => (
                  <div key={`${g.gameId}-${i}`} className="pg-glass" onClick={() => setSelectedGame(sortedGames.find(x => x.gameId === g.gameId) ?? null)}
                    style={{ width: 220, padding: 16, display: "flex", gap: 14, alignItems: "center", cursor: "pointer", transition: "border-color 0.15s" }}>
                    <img src={gameImg(g.genre, g.imageUrl)} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)" }} />
                    <div>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.maxPlayers} players · {g.genre}</p>
                      <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>[{g.tag}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pg-scroll-row">
              {sortedGames.slice(0, 6).map((g) => (
                <div key={g.gameId} onClick={() => setSelectedGame(g)} style={{ cursor: "pointer" }}>
                  <GameCard img={gameImg(g.genre, g.imageUrl)} title={g.name} size="sm"
                    meta={<p style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 6 }}>{g.maxPlayers} players · {g.genre}</p>} />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {hasChampions && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="Victory lap" title="Tournament champions" />
            <motion.div variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewOpts}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {data.champions.map((c) => <ChampionCard key={c.tournamentId} champion={c} />)}
            </motion.div>
          </motion.section>
        )}

        {trending.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="Trending" title="Active tournaments" action={<PgBtn variant="ghost" size="sm" onClick={() => navigate("/dashboard/tournaments")}>All</PgBtn>} />
            {regError && <div style={{ marginBottom: 12 }}><ErrorBox message={regError} /></div>}
            <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewOpts}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {trending.map((t) => {
                const myReg = myRegs.find(r => r.tournamentId === t.tournamentId);
                const isRegistered = !!myReg;
                const isOpen = t.status === "open";
                return (
                  <motion.div key={t.tournamentId} variants={slideInView}
                    onClick={() => navigate(`/dashboard/tournaments/${t.tournamentId}`)}
                    style={{ cursor: "pointer" }}>
                    <GameCard img={gameImg(t.gameName, t.imageUrl)} title={t.name} size="lg"
                      meta={
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: "rgba(124,92,255,0.2)", color: "var(--violet2)" }}>{t.gameName}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: "rgba(0,212,255,0.15)", color: "var(--cyan)" }}>{t.status}</span>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--cyan)", marginBottom: 8 }}>{t.registeredCount}/{t.maxTeams} teams registered</p>
                          {isOpen && (
                            <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
                              {isRegistered ? (
                                <>
                                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--green)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--green)", background: "rgba(0,240,160,0.08)" }}>✓ Registered</span>
                                  <button
                                    disabled={cancellingId === t.tournamentId}
                                    onClick={(e) => cancelReg(t, e)}
                                    style={{ fontSize: 10, fontFamily: "var(--font-ui)", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,80,80,0.5)", background: "rgba(255,60,60,0.08)", color: "#ff6060", cursor: "pointer" }}>
                                    {cancellingId === t.tournamentId ? "..." : "Cancel"}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => openRegModal(t, e)}
                                  style={{ fontSize: 10, fontFamily: "var(--font-ui)", fontWeight: 700, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--violet)", background: "rgba(124,92,255,0.15)", color: "var(--violet2)", cursor: "pointer" }}>
                                  Register team
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>
        )}

        <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
          <SectionTitle eyebrow="Soon" title="Upcoming games" />
          {/* HARDKODOVANE placeholder igre — izmeni UPCOMING_GAMES (slike i tekst) na vrhu fajla. */}
          <div className="pg-scroll-row">
            {UPCOMING_GAMES.map((g, i) => (
              <div key={i}>
                <GameCard img={g.img} title={g.name} desc={g.info} size="lg" />
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView}>
          <SectionTitle eyebrow="Brzo" title="Tvoja komandna tabla" />
          <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewOpts}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {actions.map((a) => (
              <motion.div key={a.to} variants={fadeUp}>
                <Link to={a.to}>
                  <TiltCard glow={a.glow} style={{ padding: 22, height: "100%" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${a.glow}1a`, border: `1px solid ${a.glow}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12, color: a.glow, boxShadow: `0 0 16px ${a.glow}35` }}>{a.icon}</div>
                    <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{a.title}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{a.desc}</p>
                  </TiltCard>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </div>

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          tournamentCount={tournamentCountByGame[selectedGame.gameId] ?? 0}
          activeTournamentCount={activeTournamentCountByGame[selectedGame.gameId] ?? 0}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Registration modal */}
      {createPortal(
        <AnimatePresence>
          {regModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
              onClick={e => { if (e.target === e.currentTarget) setRegModal(null); }}>
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
                className="pg-glass" style={{ width: "100%", maxWidth: 400, padding: 28, borderRadius: 16, display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Tournament registration</h3>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{regModal.name}</p>
                  </div>
                  <button onClick={() => setRegModal(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>
                {regError && <ErrorBox message={regError} />}
                {captainTeams.length === 1 ? (
                  <div style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(124,92,255,0.06)" }}>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>Team</p>
                    <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {captainTeams[0].teamName} <span style={{ color: "var(--violet2)", fontSize: 12 }}>[{captainTeams[0].tag}]</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Choose a team</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {captainTeams.map(team => (
                        <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)}
                          style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${selectedTeamId === team.teamId ? "var(--violet)" : "var(--border)"}`, background: selectedTeamId === team.teamId ? "rgba(124,92,255,0.12)" : "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{team.teamName}</span>
                          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--violet2)" }}>[{team.tag}]</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <PgBtn variant="ghost" size="sm" onClick={() => setRegModal(null)}>Cancel</PgBtn>
                  <PgBtn variant="primary" size="sm" disabled={regSaving || !selectedTeamId} onClick={register}>
                    {regSaving ? "Registering..." : "Register team"}
                  </PgBtn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ─── Game Detail Modal ─── */

function GameDetailModal({ game, tournamentCount, activeTournamentCount, onClose }: {
  game: GameCatalog;
  tournamentCount: number;
  activeTournamentCount: number;
  onClose: () => void;
}) {
  const img = game.imageUrl
    ? (game.imageUrl.startsWith("http") ? game.imageUrl : (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "") + game.imageUrl)
    : (GENRE_IMG[game.genre.toLowerCase()] ?? IMG.default);

  const stats = [
    { label: "Genre", value: game.genre },
    { label: "Max players", value: String(game.maxPlayers) },
    { label: "Tag", value: `[${game.tag}]` },
    { label: "Total tournaments", value: String(tournamentCount) },
    { label: "Active tournaments", value: String(activeTournamentCount), highlight: activeTournamentCount > 0 },
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div key="game-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 480, borderRadius: 20, overflow: "hidden", border: "1px solid var(--border-bright)", background: "var(--bg-card, #0d0b1a)" }}>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <img src={img} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(13,11,26,0.95) 100%)" }} />
            <button onClick={onClose}
              style={{ position: "absolute", top: 12, right: 14, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", fontSize: 18, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            {activeTournamentCount > 0 && (
              <span style={{ position: "absolute", top: 12, left: 14, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 6, background: "rgba(0,212,255,0.2)", border: "1px solid rgba(0,212,255,0.4)", color: "var(--cyan)" }}>
                🔴 LIVE
              </span>
            )}
            <div style={{ position: "absolute", bottom: 16, left: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "0.03em" }}>{game.name}</h2>
            </div>
          </div>
          <div style={{ padding: "20px 22px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: s.highlight ? "var(--cyan)" : "var(--text)" }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
