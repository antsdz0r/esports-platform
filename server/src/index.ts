import "dotenv/config";
import app, { db, logger, proSyncService } from "./app";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

// Koliko cesto se osvezavaju LIVE + ZAVRSENI mecevi (default 15 min).
const LIVE_INTERVAL_MS = parseInt(process.env.PRO_SYNC_LIVE_INTERVAL_MS ?? "900000", 10);
// Koliko cesto se povlace NOVI (nadolazeci) mecevi (default 24h).
const UPCOMING_INTERVAL_MS = parseInt(process.env.PRO_SYNC_UPCOMING_INTERVAL_MS ?? "86400000", 10);

// Periodicno povlaci pro meceve/rezultate sa izvora da baza (a time i /pro) bude sveza.
function startProAutoSync(): void {
  if (!process.env.PANDASCORE_TOKEN) {
    logger.info("ProSync", "PANDASCORE_TOKEN nije postavljen — auto-sync iskljucen");
    return;
  }

  const warnIfFail = (label: string) => (r: { ok: boolean; error?: string }): void => {
    if (!r.ok) logger.warn("ProSync", `${label}: ${r.error ?? "sync nije uspeo"}`);
  };

  // 1) Na svakom pokretanju/restartu — pun sync (live + nadolazeci + zavrseni),
  //    da onaj ko pokrene aplikaciju odmah ima sveze podatke.
  void proSyncService.sync().then(warnIfFail("startup"));

  // 2) Live + zavrseni — cesto (default 15 min).
  setInterval(() => {
    void proSyncService.syncKinds(["running", "past"]).then(warnIfFail("live+past"));
  }, LIVE_INTERVAL_MS);

  // 3) Novi (nadolazeci) — retko (default jednom dnevno).
  setInterval(() => {
    void proSyncService.syncKinds(["upcoming"]).then(warnIfFail("upcoming"));
  }, UPCOMING_INTERVAL_MS);

  logger.info(
    "ProSync",
    `Auto-sync: startup=pun, live+zavrseni=${Math.round(LIVE_INTERVAL_MS / 60000)}min, novi=${Math.round(UPCOMING_INTERVAL_MS / 3600000)}h`
  );
}

async function start(): Promise<void> {
  await db.init();

  app.listen(PORT, () => {
    logger.info("Server", `Running at http://localhost:${PORT}/api`);
    startProAutoSync();
  });
}

start().catch(() => logger.error("Server", "Fatal startup error"));
