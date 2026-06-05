import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { StatCard, Counter, TiltCard, PgBtn, StatusBadge, Spinner } from "../../components/ui/UI";
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
  { img: IMG.hero1, tags: ["Explore", "Play", "Win"], title: "Igraj i osvajaj", desc: "Podigni esports iskustvo — timovi, turniri i mečevi na jednoj platformi." },
  { img: IMG.hero2, tags: ["Explore", "Compete", "Rank"], title: "Istraži turnire", desc: "Pronađi otvorene turnire, prijavi tim i prati rezultate uživo." },
  { img: IMG.hero3, tags: ["Join", "Team", "Dominate"], title: "Pridruži se zajednici", desc: "Pozovi igrače, formiraj ekipu i kreni u sledeći meč." },
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
  name: string;
  status: string;
  gameName: string;
  format: string;
  registeredCount: number;
  maxTeams: number;
}

interface Match {
  gameId: number;
  tournamentId: number;
  team1Name: string | null;
  team2Name: string | null;
  score: string;
  status: string;
  round: number;
}

interface DashboardData {
  games: GameCatalog[];
  tournaments: Tournament[];
  teams: { teamId: number }[];
  watchlist: Tournament[];
  wins: number;
  liveTournament: Tournament | null;
  liveMatch: Match | null;
  upcoming: Match[];
}

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
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,28px)", fontWeight: 900, letterSpacing: "0.04em" }}>{title}</h2>
      </div>
      {action}
    </div>
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
    liveTournament: null, liveMatch: null, upcoming: [],
  });

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    const load = async () => {
      setLoading(true);
      try {
        const [gamesRes, tournamentsRes, teamsRes, watchlistRes, winsRes, upcomingRes] = await Promise.all([
          fetch(`${BASE}games`),
          fetch(`${BASE}tournaments`),
          fetch(`${BASE}teams`, { headers }),
          fetch(`${BASE}tournaments/watchlist/my`, { headers }),
          fetch(`${BASE}matches/my/wins`, { headers }),
          fetch(`${BASE}matches/scheduled?limit=5`),
        ]);

        const games = parseData<GameCatalog>(await gamesRes.json());
        const tournaments = parseData<Tournament>(await tournamentsRes.json());
        const teams = parseData<{ teamId: number }>(await teamsRes.json());
        const watchlist = parseData<Tournament>(await watchlistRes.json());
        const winsJson = await winsRes.json();
        const wins = parseItem<{ wins: number }>(winsJson)?.wins ?? 0;
        const upcoming = parseData<Match>(await upcomingRes.json());

        const liveTournament = tournaments.find((t) => t.status === "ongoing") ?? null;
        let liveMatch: Match | null = null;

        if (liveTournament) {
          const mRes = await fetch(`${BASE}matches/tournament/${liveTournament.tournamentId}`);
          const matches = parseData<Match>(await mRes.json());
          liveMatch = matches.find((m) => m.status === "ongoing" || m.status === "in_progress")
            ?? matches.find((m) => m.status === "completed")
            ?? matches[0] ?? null;
        }

        setData({ games, tournaments, teams, watchlist, wins, liveTournament, liveMatch, upcoming });
      } catch {
        /* keep empty state */
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const actions = [
    { to: "/dashboard/teams", icon: "◎", title: "Moji timovi", desc: "Sastav, pozivi, kapitenstvo.", glow: "var(--violet)" },
    { to: "/dashboard/tournaments", icon: "◈", title: "Turniri", desc: "Prijave i raspored mečeva.", glow: "var(--cyan)" },
    { to: "/dashboard/invites", icon: "✉", title: "Pozivnice", desc: "Prihvati ili odbij pozive.", glow: "var(--pink)" },
    { to: "/dashboard/watchlist", icon: "★", title: "Watchlist", desc: "Prati omiljene turnire.", glow: "var(--gold)" },
  ];

  const current = HERO_SLIDES[slide];
  const sortedGames = [...data.games].sort((a, b) => b.maxPlayers - a.maxPlayers);
  const trending = data.tournaments.filter((t) => t.status === "ongoing" || t.status === "open").slice(0, 4);
  const recentGames = [...data.games].slice(-4).reverse();

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
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 16, textShadow: "0 0 40px rgba(124,92,255,0.35)" }}>{current.title}</h1>
          <p style={{ fontSize: 16, color: "var(--text-soft)", lineHeight: 1.65, marginBottom: 28, maxWidth: 480 }}>{current.desc}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PgBtn variant="primary" onClick={() => navigate("/dashboard/tournaments")}>Istraži turnire</PgBtn>
            <PgBtn variant="ghost" onClick={() => navigate("/dashboard/teams")}>Moji timovi</PgBtn>
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
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{data.liveTournament.gameName} · {data.liveTournament.registeredCount}/{data.liveTournament.maxTeams} timova</p>
                  </div>
                  <StatusBadge status={data.liveTournament.status} />
                </div>
                {data.liveMatch ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800 }}>{data.liveMatch.team1Name ?? "TBD"}</p>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: "var(--cyan)", textShadow: "0 0 20px var(--glow-cyan)" }}>{data.liveMatch.score.replace(":", " : ")}</span>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800 }}>{data.liveMatch.team2Name ?? "TBD"}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Nema aktivnih mečeva.</p>
                )}
                <PgBtn variant="cyan" size="sm" full onClick={() => navigate("/dashboard/tournaments")}>Pogledaj turnir</PgBtn>
              </>
            ) : (
              <div>
                <p className="pg-eyebrow" style={{ marginBottom: 8 }}>Live turnir</p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>Trenutno nema turnira u toku.</p>
                <PgBtn variant="cyan" size="sm" full onClick={() => navigate("/dashboard/tournaments")}>Pregledaj turnire</PgBtn>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeInView} className="pg-glass" style={{ padding: 24 }}>
            <p className="pg-eyebrow" style={{ marginBottom: 12 }}>Sledeći mečevi</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.upcoming.length > 0 ? data.upcoming.map((m) => (
                <div key={m.gameId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(124,92,255,0.06)", border: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--cyan)", minWidth: 44 }}>R{m.round}</span>
                  <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{m.team1Name ?? "TBD"} <span style={{ color: "var(--text-dim)" }}>vs</span> {m.team2Name ?? "TBD"}</span>
                </div>
              )) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nema zakazanih mečeva.</p>}
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="show" viewport={viewOpts}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          <motion.div variants={fadeUp}><StatCard label="Uloga" value={user?.role ?? "player"} color="var(--violet2)" icon="🎮" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Timovi" value={<Counter value={data.teams.length} />} color="var(--cyan)" icon="◎" sub="aktivnih" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Turniri" value={<Counter value={data.watchlist.length} />} color="var(--green)" icon="◈" sub="praćenih" /></motion.div>
          <motion.div variants={fadeUp}><StatCard label="Pobede" value={<Counter value={data.wins} />} color="var(--gold)" icon="🏆" sub="ukupno" /></motion.div>
        </motion.div>

        {sortedGames.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="Popularno" title="Igre u katalogu" />
            <div style={{ overflow: "hidden", marginBottom: 16, maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)" }}>
              <div className="pg-marquee">
                {[...sortedGames, ...sortedGames].map((g, i) => (
                  <div key={`${g.gameId}-${i}`} className="pg-glass" style={{ width: 220, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
                    <img src={gameImg(g.genre, g.imageUrl)} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)" }} />
                    <div>
                      <p style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.maxPlayers} igrača · {g.genre}</p>
                      <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>[{g.tag}]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pg-scroll-row">
              {sortedGames.slice(0, 6).map((g) => (
                <GameCard key={g.gameId} img={gameImg(g.genre, g.imageUrl)} title={g.name} size="sm"
                  meta={<p style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 6 }}>{g.maxPlayers} igrača · {g.genre}</p>} />
              ))}
            </div>
          </motion.section>
        )}

        {trending.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="U trendu" title="Aktivni turniri" action={<PgBtn variant="ghost" size="sm" onClick={() => navigate("/dashboard/tournaments")}>Sve</PgBtn>} />
            <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewOpts}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {trending.map((t) => (
                <motion.div key={t.tournamentId} variants={slideInView}>
                  <GameCard img={gameImg(t.gameName)} title={t.name} size="lg"
                    meta={
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: "rgba(124,92,255,0.2)", color: "var(--violet2)" }}>{t.gameName}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: "rgba(0,212,255,0.15)", color: "var(--cyan)" }}>{t.status}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--cyan)" }}>{t.registeredCount}/{t.maxTeams} timova prijavljeno</p>
                      </div>
                    }
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {recentGames.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={viewOpts} variants={fadeInView} style={{ marginBottom: 44 }}>
            <SectionTitle eyebrow="Katalog" title="Igre u bazi" />
            <div className="pg-scroll-row">
              {recentGames.map((g) => (
                <GameCard key={g.gameId} img={gameImg(g.genre, g.imageUrl)} title={g.name} desc={`${g.genre} · do ${g.maxPlayers} igrača · tag [${g.tag}]`} size="lg" />
              ))}
            </div>
          </motion.section>
        )}

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
    </div>
  );
}
