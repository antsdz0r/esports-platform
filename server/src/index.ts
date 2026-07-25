import "dotenv/config";
import app, { db, logger, proSyncService } from "./app";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const SYNC_INTERVAL_MS = parseInt(process.env.PRO_SYNC_INTERVAL_MS ?? "120000", 10);

// Periodicno povlaci pro meceve/rezultate sa izvora da baza (a time i /pro) bude sveza.
function startProAutoSync(): void {
  if (!process.env.PANDASCORE_TOKEN) {
    logger.info("ProSync", "PANDASCORE_TOKEN nije postavljen — auto-sync iskljucen");
    return;
  }
  const run = (): void => {
    void proSyncService.sync().then((r) => {
      if (!r.ok) logger.warn("ProSync", r.error ?? "sync nije uspeo");
    });
  };
  run();
  setInterval(run, SYNC_INTERVAL_MS);
  logger.info("ProSync", `Auto-sync svakih ${Math.round(SYNC_INTERVAL_MS / 1000)}s`);
}

async function start(): Promise<void> {
  await db.init();

  app.listen(PORT, () => {
    logger.info("Server", `Running at http://localhost:${PORT}/api`);
    startProAutoSync();
  });
}

start().catch(() => logger.error("Server", "Fatal startup error"));
