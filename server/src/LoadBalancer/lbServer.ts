import "dotenv/config";
import { createServer } from "http";
import { ConsoleLoggerService } from "../Services/logger/ConsoleLoggerService";
import { LoadBalancer } from "./LoadBalancer";

const logger = new ConsoleLoggerService();
const lb = new LoadBalancer(logger);
const LB_PORT = parseInt(process.env.LB_PORT ?? "3000", 10);

async function start(): Promise<void> {
  await lb.init();
  createServer((req, res) => lb.proxy(req, res)).listen(LB_PORT, () => {
    logger.info("LoadBalancer", `Listening on port ${LB_PORT}`);
  });
}

start().catch(() => logger.error("LoadBalancer", "Fatal startup error"));