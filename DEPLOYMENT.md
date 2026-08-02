# PulseGrid — Deployment (dev → produkcija)

Cilj: sajt na iznajmljenom serveru/hostingu radi **identično kao u dev-u**. Skoro sve ide
preko env varijabli — u produkciji se menjaju vrednosti (domen umesto `localhost`), ne kod.

---

## 1. Topologija (preporuka)

Jedan **reverse-proxy (nginx ili Caddy)** na tvom domenu preko HTTPS-a radi tri stvari:

1. servira izbildovan **klijent** (statika iz `client/dist`),
2. proksira **`/api`** na backend (Express),
3. proksira **`/ws/chat`** na backend **sa WebSocket upgrade header-ima**.

```
Browser ──HTTPS/WSS──▶  nginx (443, tvoj domen)
                         ├─ /            → client/dist (statika)
                         ├─ /api/…       → 127.0.0.1:4000 (backend REST)
                         └─ /ws/chat     → 127.0.0.1:4000 (backend WebSocket, upgrade)

backend (Node/Express, :4000) ──▶ MySQL (master :3306 [+ slave-ovi opciono])
                              └──▶ PandaScore API (https, odlazni)
```

Tako browser priča samo sa `https://tvojdomen` i `wss://tvojdomen` — kao što u dev-u priča
sa `localhost`. Nginx preuzima ulogu balansera/proksija, pa custom Node `load-balancer` u
produkciji **nije neophodan** (ako ga zadržiš, i on mora da prosleđuje WS — nginx je jednostavniji).

---

## 2. Environment varijable (dev → prod)

**`client/.env` (prod):**
```
VITE_API_URL=https://tvojdomen/api/
# VITE_WS_URL OSTAVITI PRAZNO -> WS se izvede iz VITE_API_URL:
#   https://tvojdomen/api/  ->  wss://tvojdomen/ws/chat  (isti domen, nginx proksira)
```
> `ws://localhost:4000` (iz dev-a) je bio samo zaobilazak jer lokalni load-balancer ne prosleđuje
> WebSocket. U prod-u ga NE postavljaš — WS ide na isti domen preko nginx-a.

**`server/.env` (prod):**
```
PORT=4000
CLIENT_URL=https://tvojdomen          # koristi ga i CORS i WS origin-provera
JWT_SECRET=<jaka-slucajna-tajna>
DB_MASTER_HOST=<db-host>
DB_MASTER_PORT=3306
DB_MASTER_USER=<user>
DB_MASTER_PASSWORD=<pass>
DB_MASTER_NAME=project_db
# slave-ovi su opcioni; ako ih nema, citanja padaju na master
DB_SLAVE1_HOST=<host>   # opciono
DB_SLAVE1_PORT=3307
DB_SLAVE2_HOST=<host>   # opciono
DB_SLAVE2_PORT=3308
PANDASCORE_TOKEN=<token sa app.pandascore.co>
PRO_SYNC_LIVE_INTERVAL_MS=900000
PRO_SYNC_UPCOMING_INTERVAL_MS=86400000
# Pick'em poravnanje (bodovi/streak/bedževi) — sigurnosni interval, default 2 min
PICKEM_SETTLE_INTERVAL_MS=120000
```

---

## 3. Baza

`server/dbinit.sql` je **izvor istine za šemu** (držan ažurnim uz svaku tabelu).

Sveža produkciona baza:
```
mysql -h <host> -u root -p project_db < server/dbinit.sql
```

Ako dodaješ na postojeću bazu, pokreni samo nedostajuće `CREATE TABLE`-ove (ako imaš replikaciju,
**samo na masteru** — replikacija prenese na slave-ove). Tabele koje projekat koristi:
`users`, `GAME_CATALOG`, `TEAMS`, `TOURNAMENTS`, `GAMES`, `TEAM_MEMBERS`, `TOURNAMENT_REGISTRATIONS`,
`MATCH_PLAYERS`, `USER_WATCHLIST`, `TEAM_INVITES`, `AUDIT_LOGS`, `MATCH_STREAMS`,
`PRO_MATCHES`, `PRO_STREAMS`, `PRO_LEAGUES`, `PRO_SERIES`, `PRO_TOURNAMENTS`, `PRO_STANDINGS`,
`PRO_FAVORITES`, `PRO_CHAT_MESSAGES`, `PRO_PREDICTIONS`, `PRO_PICKEM_STATS`, `USER_BADGES`.

Replikacija (master–slave) je opciona za rad sajta — `DbManager` fallback-uje čitanja na master.

### 3a. Migracija za Pick'em + bedževe (nove tabele)

Za **postojeću živu bazu** pokreni ove `CREATE TABLE`-ove **samo na masteru** (`127.0.0.1:3306`) —
replikacija ih prenese na slave-ove. (Za svežu bazu su već u `dbinit.sql`.) Katalog bedževa je u kodu
(`server/src/Domain/constants/BadgeDefinitions.ts`), pa nema seed-a — samo tri tabele:

```sql
CREATE TABLE PRO_PREDICTIONS(
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  pro_match_id   INT NOT NULL,
  predicted_side TINYINT      NOT NULL,          -- 1 = team1, 2 = team2
  is_correct     TINYINT(1)   NULL,              -- NULL dok meč nije poravnat
  points_awarded INT          NOT NULL DEFAULT 0,
  settled_at     DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pred (user_id, pro_match_id),
  INDEX idx_pred_user (user_id),
  INDEX idx_pred_match (pro_match_id),
  INDEX idx_pred_unsettled (is_correct),
  FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (pro_match_id) REFERENCES PRO_MATCHES(id) ON DELETE CASCADE
);

CREATE TABLE PRO_PICKEM_STATS(
  user_id             INT UNSIGNED PRIMARY KEY,
  total_points        INT NOT NULL DEFAULT 0,
  total_predictions   INT NOT NULL DEFAULT 0,
  correct_predictions INT NOT NULL DEFAULT 0,
  current_streak      INT NOT NULL DEFAULT 0,
  best_streak         INT NOT NULL DEFAULT 0,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pickem_points (total_points),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE USER_BADGES(
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  badge_code VARCHAR(50)  NOT NULL,
  earned_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_badge (user_id, badge_code),
  INDEX idx_user_badges_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 4. Build i pokretanje

**Klijent (statika):**
```
cd client
npm ci
npm run build          # -> client/dist  (to servira nginx)
```

**Server:**
```
cd server
npm ci
npm run build          # tsc -> dist/  (uhvati i tipske greske)
node dist/index.js     # ili preko pm2 (dole)
```

**Process manager (pm2) — da radi kao servis i restartuje se:**
```
npm i -g pm2
cd server
pm2 start dist/index.js --name pulsegrid-api
pm2 save
pm2 startup            # prati ispisano uputstvo (systemd), da preživi reboot
```

> U dev-u je `nodemon + ts-node`; u prod-u `node dist/index.js` pod pm2/systemd.

---

## 5. nginx (statika + /api + /ws/chat + TLS)

```nginx
# HTTP -> HTTPS
server {
    listen 80;
    server_name tvojdomen;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tvojdomen;

    ssl_certificate     /etc/letsencrypt/live/tvojdomen/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tvojdomen/privkey.pem;

    # 1) Klijent (Vite build) + SPA fallback
    root /var/www/pulsegrid/client/dist;
    index index.html;
    location / {
        try_files $uri /index.html;
    }

    # 2) REST API -> backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3) WebSocket chat -> backend (KLJUČNO: upgrade header-i)
    location /ws/chat {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;   # da WS ne pukne na idle
    }
}
```

TLS sertifikat najlakše Let's Encrypt-om: `certbot --nginx -d tvojdomen`.

> Caddy alternativa: automatski HTTPS, a `reverse_proxy /ws/chat 127.0.0.1:4000` sam rukuje WS upgrade-om.

---

## 6. WebSocket — šta mora u prod-u

- **`wss://` (TLS) je obavezan** jer je sajt `https://` — browser blokira `ws://` sa https stranice
  (mixed content). Nginx to daje automatski (TLS na 443).
- Nginx `location /ws/chat` mora imati `Upgrade`/`Connection` header-e (gore). To zamenjuje dev hack
  „direktno na 4000".
- **Origin-provera**: gateway prima WS samo sa `CLIENT_URL` origin-a. Zato `CLIENT_URL` mora tačno
  biti tvoj domen (npr. `https://tvojdomen`, bez završne kose crte). Prazno ili `*` = propušta sve (dev).

---

## 7. Checklist (dev → prod)

- [ ] `client/.env`: `VITE_API_URL=https://tvojdomen/api/`, `VITE_WS_URL` prazno.
- [ ] `server/.env`: `CLIENT_URL=https://tvojdomen`, `JWT_SECRET`, `DB_*`, `PANDASCORE_TOKEN`.
- [ ] Baza: pokrenut `dbinit.sql` (ili svi `CREATE TABLE`-ovi), uklj. `PRO_FAVORITES`, `PRO_CHAT_MESSAGES`,
      `PRO_PREDICTIONS`, `PRO_PICKEM_STATS`, `USER_BADGES` (vidi 3a).
- [ ] `cd server && npm ci && npm run build` (bez tipskih grešaka) → pm2 `node dist/index.js`.
- [ ] `cd client && npm ci && npm run build` → `client/dist` servira nginx.
- [ ] nginx: statika + `/api` + `/ws/chat` (upgrade) + TLS; `certbot`.
- [ ] Admin nalog: `UPDATE users SET role='admin' WHERE gamer_tag='<tag>';` pa relogin.
- [ ] Provera: otvori lajv meč → chat „connected" (zeleno), poruke rade; favoriti rade; strimovi se embed-uju.
- [ ] Provera Pick'em: `/dashboard/pickem` → tipuj pobednika predstojećeg meča; posle završetka meča (auto-sync
      ili „⟳ Sync" na `/admin/pro`) rezultat se poravna, bodovi/streak/rang i bedževi se ažuriraju.

---

## 8. Poznata ograničenja / naredni koraci za skaliranje

- **Chat sobe su u memoriji jednog Node procesa.** Na jednom serveru (jedan backend proces) radi
  1:1 kao u dev-u. Ako budeš vrteo **više** backend instanci iza balansera, chat traži
  **Redis pub/sub** (deljene sobe) + sticky sesije ili zaseban chat-node. Nije potrebno za lansiranje.
- PandaScore besplatni tier: rezultati kasne; rate-limit 1000 req/h.
- Twitch embed koristi `window.location.hostname` za `parent` — radi i na localhost i na domenu (bez izmena).
- (Opciono) `app.set('trust proxy', 1)` + čitanje `X-Forwarded-For` ako želiš pravi IP klijenta u
  audit logovima (iza nginx-a je inače `127.0.0.1`).
- Samo zvanični iframe embed strimova (bez skrejpovanja videa) — legalno i uslov za AdSense.
- **Pick'em poravnanje** je idempotentno i vođeno postojećim ProSync-om: kada pro meč dobije finalni
  status (`finished` sa odlučenim pobednikom), neporavnate predikcije se boduju (10 + streak bonus do +10),
  ažuriraju se `PRO_PICKEM_STATS` (bodovi/tačnost/streak, izvor rang liste) i dodeljuju bedževi. Ništa novo
  za deploy osim tri tabele + opcioni `PICKEM_SETTLE_INTERVAL_MS`. PandaScore free tier kasni sa rezultatima,
  pa se i tipovi poravnaju sa istim kašnjenjem.
- **UI jezik je engleski.** Ceo klijent + poruke koje backend vraća su prevedeni na engleski (datumi koriste
  `en-GB`). Interni dev-komentari u kodu ostaju na srpskom (nisu deo sajta).
