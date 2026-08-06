import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import { ConsoleLoggerService } from "./Services/logger/ConsoleLoggerService";
import { DbManager } from "./Database/connection/DbConnectionPool";

import { UserRepository } from "./Database/repositories/users/UserRepository";
import { AuditLogRepository } from "./Database/repositories/audit_logs/AuditLogRepository";
import { ProMatchRepository } from "./Database/repositories/pro/ProMatchRepository";
import { ProStreamRepository } from "./Database/repositories/pro/ProStreamRepository";
import { ProLeagueRepository } from "./Database/repositories/pro/ProLeagueRepository";
import { ProSerieRepository } from "./Database/repositories/pro/ProSerieRepository";
import { ProTournamentRepository } from "./Database/repositories/pro/ProTournamentRepository";
import { ProStandingRepository } from "./Database/repositories/pro/ProStandingRepository";
import { ProFavoriteRepository } from "./Database/repositories/pro/ProFavoriteRepository";
import { ChatRepository } from "./Database/repositories/chat/ChatRepository";
import { ProMatchWatchlistRepository } from "./Database/repositories/pro/ProMatchWatchlistRepository";
import { PredictionRepository } from "./Database/repositories/pickem/PredictionRepository";
import { PickemStatsRepository } from "./Database/repositories/pickem/PickemStatsRepository";
import { UserBadgeRepository } from "./Database/repositories/pickem/UserBadgeRepository";

import { AuthService } from "./Services/auth/AuthService";
import { UserService } from "./Services/users/UserService";
import { AuditLogService } from "./Services/audit_logs/AuditLogService";
import { HealthService } from "./Services/health/HealthService";
import { PandaScoreClient } from "./Services/pro/PandaScoreClient";
import { ProSyncService } from "./Services/pro/ProSyncService";
import { ProMatchService } from "./Services/pro/ProMatchService";
import { ProStreamAdminService } from "./Services/pro/ProStreamAdminService";
import { ProStructureSyncService } from "./Services/pro/ProStructureSyncService";
import { ProTournamentService } from "./Services/pro/ProTournamentService";
import { ProFavoriteService } from "./Services/pro/ProFavoriteService";
import { ChatService } from "./Services/chat/ChatService";
import { ChatGateway } from "./WebAPI/realtime/ChatGateway";
import { ProMatchWatchlistService } from "./Services/pro/ProMatchWatchlistService";
import { BadgeService } from "./Services/pickem/BadgeService";
import { PickemService } from "./Services/pickem/PickemService";

import { AuthController } from "./WebAPI/controllers/AuthController";
import { UserController } from "./WebAPI/controllers/UserController";
import { HealthCheckController } from "./WebAPI/controllers/HealthCheckController";
import { AuditLogController } from "./WebAPI/controllers/AuditLogController";
import { ProController } from "./WebAPI/controllers/ProController";
import { ProTournamentController } from "./WebAPI/controllers/ProTournamentController";
import { PickemController } from "./WebAPI/controllers/PickemController";

export const logger = new ConsoleLoggerService();
export const db     = new DbManager(logger);

// Repositories
const userRepo = new UserRepository(db, logger);
const auditLogRepo = new AuditLogRepository(db, logger);
const proMatchRepo = new ProMatchRepository(db, logger);
const proStreamRepo = new ProStreamRepository(db, logger);
const proLeagueRepo = new ProLeagueRepository(db, logger);
const proSerieRepo = new ProSerieRepository(db, logger);
const proTournamentRepo = new ProTournamentRepository(db, logger);
const proStandingRepo = new ProStandingRepository(db, logger);
const proFavoriteRepo = new ProFavoriteRepository(db, logger);
const chatRepo = new ChatRepository(db, logger);
const proMatchWatchlistRepo = new ProMatchWatchlistRepository(db, logger);
const predictionRepo = new PredictionRepository(db, logger);
const pickemStatsRepo = new PickemStatsRepository(db, logger);
const userBadgeRepo = new UserBadgeRepository(db, logger);

// Services
const authService = new AuthService(userRepo);
const userService = new UserService(userRepo);
const auditLogService = new AuditLogService(auditLogRepo);
const healthService = new HealthService(db);
const pandaScoreClient = new PandaScoreClient(logger, process.env.PANDASCORE_TOKEN ?? "");
export const proSyncService = new ProSyncService(pandaScoreClient, proMatchRepo, proStreamRepo, logger);
const proMatchService = new ProMatchService(proMatchRepo, proStreamRepo);
const proStreamAdminService = new ProStreamAdminService(proStreamRepo, proMatchRepo);
export const proStructureSyncService = new ProStructureSyncService(pandaScoreClient, proLeagueRepo, proSerieRepo, proTournamentRepo, logger);
const proTournamentService = new ProTournamentService(pandaScoreClient, proLeagueRepo, proSerieRepo, proTournamentRepo, proStandingRepo, proMatchRepo);
const proFavoriteService = new ProFavoriteService(proFavoriteRepo);
const chatService = new ChatService(chatRepo);
const proMatchWatchlistService = new ProMatchWatchlistService(proMatchWatchlistRepo);
export const chatGateway = new ChatGateway(chatService, logger, process.env.JWT_SECRET ?? "", process.env.CLIENT_URL ?? "");
const badgeService = new BadgeService(pickemStatsRepo, predictionRepo, userBadgeRepo);
export const pickemService = new PickemService(proMatchRepo, predictionRepo, pickemStatsRepo, userBadgeRepo, badgeService, logger);

// Express rute
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? "*" }));
app.use(express.json());
app.set('etag', false);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", new AuthController(authService, auditLogService).getRouter());
app.use("/api", new UserController(userService, auditLogService).getRouter());
app.use("/api", new HealthCheckController(healthService).getRouter());
app.use("/api", new AuditLogController(auditLogService).getRouter());
app.use("/api", new ProController(proMatchService, proSyncService, proStreamAdminService, auditLogService, proMatchWatchlistService).getRouter());
app.use("/api", new ProTournamentController(proTournamentService, proStructureSyncService, auditLogService, proFavoriteService).getRouter());
app.use("/api", new PickemController(pickemService).getRouter());

export default app;
