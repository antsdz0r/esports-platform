import "dotenv/config";
import app, { db, logger, proSyncService, proStructureSyncService, chatGateway, pickemService } from "./app";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

// Kako često se poravnavaju pick'em tipovi (bodovi/streak/bedževi) kao sigurnosna mreža
// nezavisno od sync-a (default 2 min). Poravnanje je jeftino i idempotentno.
const PICKEM_SETTLE_INTERVAL_MS = parseInt(process.env.PICKEM_SETTLE_INTERVAL_MS ?? "120000", 10);

// Koliko cesto se osvezavaju LIVE + ZAVRSENI mecevi (default 15 min).
const LIVE_INTERVAL_MS = parseInt(process.env.PRO_SYNC_LIVE_INTERVAL_MS ?? "900000", 10);
// Koliko cesto se povlace NOVI (nadolazeci) mecevi (default 24h).
const UPCOMING_INTERVAL_MS = parseInt(process.env.PRO_SYNC_UPCOMING_INTERVAL_MS ?? "86400000", 10);
// Koliko cesto se sinhronizuje STRUKTURA turnira (lige/serije/turniri) (default 24h).
const STRUCTURE_INTERVAL_MS = parseInt(process.env.PRO_STRUCTURE_INTERVAL_MS ?? "86400000", 10);

// Periodicno povlaci pro meceve/rezultate sa izvora da baza (a time i /pro) bude sveza.
function startProAutoSync(): void {
  if (!process.env.PANDASCORE_TOKEN) {
    logger.info("ProSync", "PANDASCORE_TOKEN nije postavljen — auto-sync iskljucen");
    return;
  }

  const warnIfFail = (label: string) => (r: { ok: boolean; error?: string }): void => {
    if (!r.ok) logger.warn("ProSync", `${label}: ${r.error ?? "sync nije uspeo"}`);
  };

  // Posle svakog sync-a koji donosi zavrsene meceve, odmah poravnaj pick'em tipove
  // (bodovi/streak/bedzevi), da rezultati budu vidljivi bez cekanja sigurnosnog intervala.
  const settleAfter = (r: { ok: boolean; error?: string }): void => {
    if (r.ok) void pickemService.settlePending();
  };

  // 1) Na svakom pokretanju/restartu — pun sync (live + nadolazeci + zavrseni),
  //    da onaj ko pokrene aplikaciju odmah ima sveze podatke.
  void proSyncService.sync().then((r) => { warnIfFail("startup")(r); settleAfter(r); });

  // 2) Live + zavrseni — cesto (default 15 min).
  setInterval(() => {
    void proSyncService.syncKinds(["running", "past"]).then((r) => { warnIfFail("live+past")(r); settleAfter(r); });
  }, LIVE_INTERVAL_MS);

  // 3) Novi (nadolazeci) — retko (default jednom dnevno).
  setInterval(() => {
    void proSyncService.syncKinds(["upcoming"]).then(warnIfFail("upcoming"));
  }, UPCOMING_INTERVAL_MS);

  // 4) Struktura turnira (lige/serije/turniri) — na startu + jednom dnevno.
  const structWarn = (r: { ok: boolean; error?: string }): void => {
    if (!r.ok) logger.warn("ProStructure", r.error ?? "structure sync nije uspeo");
  };
  void proStructureSyncService.syncStructure().then(structWarn);
  setInterval(() => {
    void proStructureSyncService.syncStructure().then(structWarn);
  }, STRUCTURE_INTERVAL_MS);

  logger.info(
    "ProSync",
    `Auto-sync: startup=pun, live+zavrseni=${Math.round(LIVE_INTERVAL_MS / 60000)}min, novi=${Math.round(UPCOMING_INTERVAL_MS / 3600000)}h, struktura=${Math.round(STRUCTURE_INTERVAL_MS / 3600000)}h`
  );
}

async function start(): Promise<void> {
  await db.init();

  const server = app.listen(PORT, () => {
    logger.info("Server", `Running at http://localhost:${PORT}/api`);
    startProAutoSync();
  });

  // Sigurnosna mreza za pick'em poravnanje — hvata i rezultate od rucnog admin sync-a
  // ("⟳ Sinhronizuj" na /admin/pro) i sve sto promakne poravnanju posle auto-sync-a.
  setInterval(() => { void pickemService.settlePending(); }, PICKEM_SETTLE_INTERVAL_MS);

  // WebSocket chat na isti HTTP server (ws://.../ws/chat).
  chatGateway.attach(server);
}

start().catch(() => logger.error("Server", "Fatal startup error"));
