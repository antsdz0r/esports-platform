# PulseGrid — kontekst projekta

Ovaj fajl je handoff/kontekst za rad na projektu (npr. iz Claude Code na drugom računaru).
Sadrži arhitekturu, konvencije, šta je do sada urađeno, kako se pokreće i šta je sledeće.

---

## 1. Šta je projekat

**PulseGrid** — esports/gaming platforma. Počela kao fakultetski projekat (distribuirani sistemi:
MySQL master-slave replikacija), a sada se razvija u koristan gaming sajt sa ciljem da privuče
saobraćaj i monetizuje reklame (AdSense) — **samo legalno** (zvanični embed strimovi, bez skrejpovanja videa).

Strateški pravac: „gledaj sve pro turnire na jednom mestu" + sloj oko strima koji veliki nemaju
spojen (bracket uživo, pick'em, zajednica). Jezgro (turniri/timovi/mečevi) ostaje netaknuto,
a novi moduli se dodaju pored njega.

---

## 2. Tehnologije i struktura

**Client** (`/client`): React + Vite + TypeScript, framer-motion, axios.
- `src/pages` — stranice (admin, user, guest, auth, pro)
- `src/components` — UI (`ui/UI.tsx` ima PgBtn, Spinner, Empty, ErrorBox, SuccessBox, PageHeader, StatCard...)
- `src/api_services/<domen>` — svaki servis ima interfejs (`I...APIService.ts`) + axios implementaciju
- `src/models`, `src/types` — tipovi
- `src/contexts/auth`, `src/hooks/auth/useAuthHook.ts` — auth (JWT u localStorage pod ključem `authToken`)
- `src/helpers` — `api.ts` (parseData/parseItem), `local_storage.ts` (readItem/saveItem), `streamEmbed.ts`
- Rute: `src/App.tsx`. Layout-i: `Layout.tsx` (auth), `GuestLayout.tsx` (gost).
- `ProtectedRoute` obavija stranice u `<Layout>` i proverava rolu.

**Server** (`/server`): Node (>=18, ima global `fetch`) + Express 5 + TypeScript, mysql2. Bez axios-a.
Čista slojevita arhitektura (SOLID):
- `src/WebAPI/controllers` — Express ruteri (auth + authorize middleware + audit log)
- `src/WebAPI/validators` — validatori (vraćaju `ValidationResult { valid, message? }`)
- `src/Services/<domen>` — implementacije servisa; interfejsi u `src/Domain/services/<domen>`
- `src/Database/repositories/<domen>` — implementacije repo-a; interfejsi u `src/Domain/repositories/<domen>`
- `src/Domain/models`, `src/Domain/DTOs`, `src/Domain/enums`
- `src/Middlewares` — `authentification/AuthMiddleware.ts` (`authenticate`), `authorization/AuthorizeMiddleware.ts` (`authorize(...roles)`)
- **DI se ručno povezuje u `src/app.ts`** (repo → service → controller). Ulaz: `src/index.ts`.

**Baza**: MySQL, master (3306) + 2 slave (3307/3308), replikacija.
- `src/Database/connection/DbConnectionPool.ts` = `DbManager`: read/write split
  (`getWriteConnection()` → master, `getReadConnection()` → round-robin slave, fallback na master),
  health-check i automatski failover. Hostovi/portovi iz env-a (default localhost:3306/3307/3308).
- Šema: `server/dbinit.sql` (referentna) i `docker/setup-replication.sh` (ugrađeni SQL koji se
  STVARNO primenjuje pri fresh setup-u). **Obe treba držati usklađene.**

**Auth/security**: JWT bearer token; role `admin` / `player`; parametrizovani SQL (nema injection);
audit log na svakoj mutaciji (`AUDIT_LOGS`).

---

## 3. Konvencije (obavezno pratiti)

- Tok: **Controller → Service(interfejs) → Repository(interfejs) → DbManager**.
- Modeli su plain klase sa default „prazan objekat" konvencijom (npr. `id = 0` kao sentinel „ne postoji").
- Repozitorijumi: `map(row)` funkcija, `try/catch` sa `logger.error`, `finally { conn.release() }`.
- Svi upiti parametrizovani (`?`). `LIMIT` sa promenljivom → sanitizovati na Integer i inline-ovati.
- Controller vraća `{ success, data }` ili `{ success, message }`; mutacije loguju preko `auditLogService.log(...)`.
- Frontend api_service: interfejs + axios impl; `BASE = import.meta.env.VITE_API_URL` (završava se sa `/`);
  auth header iz `readItem("authToken")`.
- UI tekst je na srpskom. **Ne stavljati navodnike unutar JSX string literala** (lako prekinu string —
  koristiti tipografske „…" ili izbeći).
- CSS varijable teme: `--violet`, `--violet2`, `--cyan`, `--green`, `--gold`, `--pink`, `--text`,
  `--text-muted`, `--text-dim`, `--border`, `--font-head`, `--font-ui`, `--font-display`; klasa `pg-glass` za kartice.

---

## 4. Šta je dodato u ranijoj sesiji

### A) Match Streams (strimovi za korisničke turnire)
- Tabela **`MATCH_STREAMS`** (FK na `GAMES` = meč). Kolone: platform ENUM(twitch/youtube/kick),
  channel, type ENUM(official/cocast/caster), language, title, is_active.
- Backend: `Domain/enums/StreamPlatform.ts`, `StreamType.ts`; modeli `MatchStream`, `CreateStreamData`,
  `UpdateStreamData`; `IMatchStreamRepository`+`MatchStreamRepository`; `IMatchStreamService`+`MatchStreamService`
  (validira meč preko `IGameRepository.exists`); `validators/streams/validateStream.ts` (whitelist regex za channel);
  `controllers/StreamController.ts`.
  - Rute: `GET /api/matches/:id/streams` (javno, aktivni), `GET /api/matches/:id/streams/all` (admin),
    `POST /api/matches/:id/streams` (admin), `PUT /api/streams/:streamId` (admin), `DELETE /api/streams/:streamId` (admin).
- Frontend: `models/stream/StreamTypes.ts`, `api_services/streams/StreamAPIService.ts`,
  `components/stream/StreamPlayer.tsx` (fetch po gameId → `StreamEmbed`),
  `components/stream/StreamAdminModal.tsx` (admin CRUD).
  Integrisano u `pages/user/TournamentDetailPage.tsx` → `MatchCard`: dugme „📺 Gledaj" (svi) i „📺 Streamovi" (admin).

### B) Pro modul (PandaScore agregacija pro mečeva) — IZOLOVAN od jezgra
- Tabele **`PRO_MATCHES`** i **`PRO_STREAMS`** (namerno NE koriste TOURNAMENTS/GAMES/TEAMS).
- Backend (`server/src/*/pro/`):
  - `Services/pro/PandaScoreClient.ts` — global `fetch` ka `https://api.pandascore.co/matches/{running|upcoming|past}`,
    token iz env-a, `Authorization: Bearer`. Tipovi `PsMatch` itd.
  - `Services/pro/parseStreamUrl.ts` — iz raw URL-a izvlači platformu+kanal (Twitch/Kick, YouTube samo video-id).
  - `Services/pro/ProSyncService.ts` — mapira PandaScore → modeli, upsert po `external_id`,
    zamenjuje `source='pandascore'` streamove (ručno dodati `source='local'` ostaju).
  - `Services/pro/ProMatchService.ts` — čitanje feed-a sa streamovima (DTO).
  - Repo: `ProMatchRepository` (upsert + findFeed), `ProStreamRepository` (replaceForMatch + findByMatchIds).
  - `controllers/ProController.ts` — `GET /api/pro/matches` (javno), `POST /api/pro/sync` (admin, audit log).
- **Auto-sync na serveru**: `src/index.ts` → `startProAutoSync()` (ako je token postavljen):
  pun sync na svakom startu/restartu; zatim `syncKinds(["running","past"])` na `PRO_SYNC_LIVE_INTERVAL_MS`
  (default 900000 = 15 min) za live+završene, i `syncKinds(["upcoming"])` na `PRO_SYNC_UPCOMING_INTERVAL_MS`
  (default 86400000 = 24h) za nove. `IProSyncService` ima `sync()` (pun) i `syncKinds(kinds, gameSlug?)`.
  `proSyncService` je exportovan iz `app.ts`.
  - **Pomirenje rezultata/statusa**: kad sync uključuje `"running"`, `ProMatchRepository.findMatchesNeedingResolve(40)`
    vraća (a) zaglavljene `'live'`/`'upcoming'` (vreme prošlo >6h, `synced_at` >2 min) i (b) skoro-završene u feed
    prozoru čiji je `synced_at` stariji od 2h (možda parcijalan skor). Za svaki se poziva `PandaScoreClient.getMatchById`
    i upsertuje PRAVI (finalni) status+skor. Što ostane nerazrešeno a starije je od 48h → `markStalePastMatchesAsFinished(48)`
    (fallback → `'finished'`). `per_page` za feed je 100. Tako i ručni „⟳ Sinhronizuj" popravlja finalne skorove;
    genuino live mečevi su zaštićeni jer ih upsert osveži pre pomirenja, a oni stariji od 3 dana ispadaju iz feed-a.
- Frontend:
  - `helpers/streamEmbed.ts` — `buildEmbedUrl(platform, channel)` + `PLATFORM_LABELS` (deljeno).
  - `components/stream/StreamEmbed.tsx` — prezentacioni plejer + izbor izvora (koriste ga i StreamPlayer i pro).
  - `models/pro/ProTypes.ts`, `api_services/pro/ProAPIService.ts` (`getMatches`, `sync`).
  - `pages/pro/ProPage.tsx` — grid kvadratnih kartica (A vs B, skor, BO, „WATCH" u neon-cyan borderu),
    filteri po statusu (Sve/Uživo/Predstojeće/Završeno) i po igri, auto-refresh svakih 30s.
  - `components/stream/ProMatchModal.tsx` — pop-up plejer sa izborom izvora; kartica: hover scale + klik otvara modal.
- Navigacija/rute (`App.tsx`, `Layout.tsx`, `GuestLayout.tsx`):
  `/pro` (javno, GuestLayout), `/admin/pro` (admin), `/dashboard/pro` (player). Nav stavka „📺 Pro mečevi".

---

## 4a. Šta je dodato u ovoj sesiji (završeni pro mečevi + ručni kasteri)

Bez novih tabela — sve koristi postojeće `PRO_MATCHES` / `PRO_STREAMS`. **Nije potrebna migracija baze.**

### C) Prikaz ZAVRŠENIH pro mečeva (uz uživo/predstojeće)
Problem: završeni mečevi se praktično nisu videli — sync je povlačio samo `running`+`upcoming`,
a feed je završene ograničavao na poslednja 24h.
- `Services/pro/PandaScoreClient.ts` — `getMatches` sada prima i `"past"`; za `past` sortira `-begin_at`
  (najskoriji prvi), za live/upcoming `begin_at`.
- `Services/pro/ProSyncService.ts` — `sync()` u `Promise.all` dodaje i `getMatches("past", 50)`;
  spaja `running + upcoming + past`. Upsert po `external_id` ostaje idempotentan (bez duplikata).
- `Database/repositories/pro/ProMatchRepository.ts` → `findFeed()`:
  - prozor završenih u feed-u je **3 dana** (`scheduled_at >= NOW() - INTERVAL 3 DAY`),
  - **grupisano sortiranje**: UŽIVO → PREDSTOJEĆE (najskoriji prvi) → ZAVRŠENO (najnoviji prvi).
- Frontend nije morao da se menja za sam prikaz — `ProPage` je već imao filter „Završeno" i `STATUS_META.finished`.

### D) Status-svesna poruka praznog plejera
- `components/stream/StreamEmbed.tsx` — dodati opcioni propsi `emptyTitle` / `emptySub`
  (default je stari live tekst).
- `components/stream/ProMatchModal.tsx` prosleđuje poruku po statusu: završen → „Meč je završen /
  Snimak nije dostupan preko izvora", predstojeći → „Meč još nije počeo".

### E) Ručno dodavanje kastera / streamova za pro mečeve (admin)
Rešava rupu PandaScore free tier-a (ne izlista poznate kastere, npr. Caedrel co-stream).
Ručni streamovi idu sa `source='local'`, `is_official=0`, i **preživljavaju auto-sync**
(jer `ProSyncService.replaceForMatch` dira samo `source='pandascore'`).
- Backend:
  - `Database/repositories/pro/ProStreamRepository.ts` — `create`, `findForMatch`,
    `deleteLocal` (briše samo `source='local'`).
  - `Database/repositories/pro/ProMatchRepository.ts` — `exists(id)` (validacija meča).
  - `Services/pro/ProStreamAdminService.ts` (+ `Domain/services/pro/IProStreamAdminService.ts`) —
    `listForMatch`, `addLocal`, `removeLocal`.
  - `WebAPI/validators/pro/validateProStream.ts` — whitelist regex (platform/channel/language).
  - `WebAPI/controllers/ProController.ts` — nove admin rute (audit log):
    `GET /api/pro/matches/:id/streams`, `POST /api/pro/matches/:id/streams`, `DELETE /api/pro/streams/:streamId`.
  - DI u `app.ts`: `proStreamAdminService` prosleđen `ProController`-u.
- Frontend:
  - `models/pro/ProTypes.ts` — tip `ProStreamAdmin` (sa `id` i `source`).
  - `api_services/pro/ProAPIService.ts` — `getMatchStreams`, `addStream`, `removeStream`.
  - `components/stream/ProStreamAdminModal.tsx` — lista streamova sa značkom RUČNO (obrisiv) /
    AUTO 🔒 (sa izvora) + forma platforma/kanal/jezik.
  - `components/stream/ProMatchModal.tsx` — dugme „🎙 Kasteri" (samo admin, props `isAdmin` +
    `onStreamsChanged`) otvara admin modal.
  - `pages/pro/ProPage.tsx` — prosleđuje `isAdmin`; `refresh()` sada ažurira i otvoreni modal
    (nađe `active` meč u svežem feed-u), pa se novi stream odmah vidi u plejeru.

---

## 5. Migracije baze (primeniti pri prelasku na novi računar / novu bazu)

Šema je već u `server/dbinit.sql` i `docker/setup-replication.sh`. Za **postojeću živu bazu** pokreni
CREATE TABLE samo na **masteru** (`127.0.0.1:3306`) — replikacija prenese na slave-ove. NE pokretati
`setup-replication.sh` na bazi sa podacima (radi `DROP DATABASE`).

Tabele iz pro/stream modula: `MATCH_STREAMS`, `PRO_MATCHES`, `PRO_STREAMS` (definicije u `dbinit.sql`).
Sesija sa završenim mečevima + ručnim kasterima **ne uvodi nove tabele** (koristi postojeći
`PRO_STREAMS.source` = 'pandascore' | 'local').

**Favoriti (nova tabela `PRO_FAVORITES`)** — pokrenuti CREATE TABLE samo na masteru (127.0.0.1:3306):
```sql
CREATE TABLE PRO_FAVORITES(
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  tournament_external_id VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pro_fav (user_id, tournament_external_id),
  INDEX idx_pro_fav_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
Backend: `IProFavoriteRepository`+`ProFavoriteRepository` (add/remove/listIds/listForUser JOIN),
`IProFavoriteService`+`ProFavoriteService` (vraća `ProTournamentListDto`); rute na `ProTournamentController`
(auth): `GET /api/pro/favorites`, `GET /api/pro/favorites/ids`, `POST/DELETE /api/pro/favorites/:id`.
Frontend: deljena `components/pro/TournamentCard.tsx` (ppv kartica + bela zvezdica favorita),
`proTournamentApi` (getFavoriteIds/listFavorites/addFavorite/removeFavorite); ProTournamentsPage
markira/togluje favorite + toast „Added to Favorites"; `Moji turniri` (user/TournamentsPage) prikazuje
sekciju „★ Omiljeni pro turniri".

**Real-time chat (nova tabela `PRO_CHAT_MESSAGES`)** — pokrenuti CREATE TABLE samo na masteru (127.0.0.1:3306):
```sql
CREATE TABLE PRO_CHAT_MESSAGES(
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_external_id VARCHAR(60) NOT NULL,
  user_id INT UNSIGNED NULL,
  gamer_tag VARCHAR(30) NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pro_chat_match (match_external_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```
Transport: **native `ws`** (potrebno `npm install ws @types/ws` u `server`). WS je zakačen na isti HTTP
server (`chatGateway.attach(server)` u `index.ts`), path `/ws/chat`. Soba = `String(proMatch.id)`.
Backend: `ChatMessage` model + `ChatMessageDto`; `IChatRepository`+`ChatRepository` (insert/lastForMatch/deleteById),
`IChatService`+`ChatService` (validacija dužine, `\s+` normalizacija; XSS-safe jer klijent renderuje kao tekst),
`WebAPI/realtime/ChatGateway.ts` (JWT iz `?token=`, room manager, rate-limit ~1/s, heartbeat, `history` na
konekciju, `message`/`delete` protokol; admin briše). DI u `app.ts` (`export const chatGateway`).
Frontend: `hooks/chat/useChatHook.ts` (WS klijent, auto-reconnect; guard `wsRef.current !== ws` protiv
duplih konekcija u StrictMode-u), `components/chat/ChatPanel.tsx` (lista + input, boja nadimka po hešu,
gost read-only). Integrisano u `ProMatchModal`: chat desno (apsolutno popuni kolonu visine leve strane,
skroluje unutra) + dugme „⛶" za theatre/fullscreen (strim + chat preko celog ekrana, Esc izlaz).
WS adresa: `VITE_WS_URL` (dev = `ws://localhost:4000`, mimo LB); u prod-u prazno → izvede se `wss://<domen>/ws/chat`
iz `VITE_API_URL`. Gateway prima WS samo sa `CLIENT_URL` origin-a (prazno/"*" = dev, sve dozvoljeno).
**Deployment**: vidi `DEPLOYMENT.md` (nginx: statika + `/api` + `/ws/chat` upgrade + TLS, prod env, pm2, migracije).

---

## 6. Env varijable

`server/.env`:
```
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=<tajna>
DB_MASTER_HOST=localhost
DB_MASTER_PORT=3306
DB_MASTER_USER=root
DB_MASTER_PASSWORD=<pass>
DB_MASTER_NAME=project_db
DB_SLAVE1_HOST=localhost
DB_SLAVE1_PORT=3307
DB_SLAVE2_HOST=localhost
DB_SLAVE2_PORT=3308
PANDASCORE_TOKEN=<token sa app.pandascore.co, besplatan tier>
PRO_SYNC_LIVE_INTERVAL_MS=900000
PRO_SYNC_UPCOMING_INTERVAL_MS=86400000
```
`client/.env`:
```
VITE_API_URL=http://localhost:4000/api/
```

PandaScore token: registracija na `app.pandascore.co`, token stoji na Dashboard-u (free tier: 1000 req/h).
Token je privatan — samo na serveru, nikad na klijentu.

---

## 7. Pokretanje

1. Baza: lokalni MySQL na 3306 (dovoljan; slave-ovi opcioni — reads padaju na master) ili Docker replikacija.
2. Server: `cd server && npm install && npm run dev` (nodemon + ts-node). Typecheck: `npm run build` ili `npm run typecheck`.
3. Client: `cd client && npm install && npm run dev` (Vite).
4. Admin nalog: u bazi `UPDATE users SET role='admin' WHERE gamer_tag='<tag>';` (pa relogin za nov JWT).
5. Pro mečevi: postavi `PANDASCORE_TOKEN`, restartuj server; auto-sync krene sam (uključujući završene),
   ili klikni „⟳ Sinhronizuj" na `/admin/pro`.
6. Ručni kaster: kao admin na `/pro` → klik na meč → „🎙 Kasteri" → dodaj platformu + kanal (npr. Twitch `caedrel`).

---

## 8. Poznata ograničenja / gotchas

- Tokom razvoja u ranijoj sesiji nije bilo moguće pokrenuti `tsc` — obavezno `npm run build`/`npm run typecheck`
  na oba dela da se uhvate tipske greške. (U ovoj sesiji su oba typecheck-a prolazila čisto.)
- PandaScore **besplatni tier**: rezultati kasne (uglavnom po završetku mape/meča, ne realno-vreme). Live low-latency = plaćeni tier.
- YouTube: embeduju se samo linkovi sa video-id (handle kanali se preskaču). Twitch/Kick rade čisto.
  Isto važi i za ručno dodate kastere.
- Za završene mečeve PandaScore često više ne vraća aktivan stream — tada plejer pokaže „Meč je završen".
- Twitch embed koristi `window.location.hostname` za obavezni `parent` param (radi na localhost i na domenu).
- Ne skrejpovati video tokove — samo zvanični iframe embed (legalno + uslov za AdSense).

---

## 9. Sledeći koraci (backlog)

- **Pick'em** (predikcije + leaderboard) preko pro/turnir mečeva — retencijski hook.
- ~~Ručno dodavanje kastera za pro mečeve~~ — **URAĐENO** (sekcija 4a/E: `source='local'` preživljava sync).
- Sistem **bedževa/statusa i sezonskih nagrada** (nula troška), kasnije sponzorisane nagrade + reklame.
- **SEO javne stranice** za timove/mečeve/turnire (indeksirani URL-ovi).
- **Dublja istorija „Završeno"**: trenutno prozor od 2 dana u feed-u; za pravi arhiv/rezultate napraviti
  zaseban endpoint + stranicu (bez limita od 2 dana), po mogućstvu sortirano po važnosti lige.
- Bracket uživo + zajednica/chat oko strima (spoj koji veliki nemaju).
- Dodati viewer count za turnire,lajv strim itd.
