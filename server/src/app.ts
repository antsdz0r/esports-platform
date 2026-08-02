import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import { ConsoleLoggerService } from "./Services/logger/ConsoleLoggerService";
import { DbManager } from "./Database/connection/DbConnectionPool";

import { UserRepository }   from "./Database/repositories/users/UserRepository";
import { GameCatalogRepository } from "./Database/repositories/game_catalog/GameCatalogRepository";
import { TournamentRepository } from "./Database/repositories/tournaments/TournamentRepository";
import { TeamRepository } from "./Database/repositories/teams/TeamRepository";
import { TeamMemberRepository } from "./Database/repositories/team_members/TeamMemberRepository";
import { TournamentRegistrationRepository } from "./Database/repositories/tournament_registration/TournamentRegistrationRepository";
import { GameRepository }                   from "./Database/repositories/games/GameRepository";
import { WatchlistRepository }              from "./Database/repositories/watchlist/WatchlistRepository";
import { MatchPlayerRepository } from "./Database/repositories/match_players/MatchPlayerRepository";
import { TeamInviteRepository } from "./Database/repositories/team_invites/TeamInvitesRepository";
import { AuditLogRepository } from "./Database/repositories/audit_logs/AuditLogRepository";
import { MatchStreamRepository } from "./Database/repositories/streams/MatchStreamRepository";
import { ProMatchRepository } from "./Database/repositories/pro/ProMatchRepository";
import { ProStreamRepository } from "./Database/repositories/pro/ProStreamRepository";
import { ProLeagueRepository } from "./Database/repositories/pro/ProLeagueRepository";
import { ProSerieRepository } from "./Database/repositories/pro/ProSerieRepository";
import { ProTournamentRepository } from "./Database/repositories/pro/ProTournamentRepository";
import { ProStandingRepository } from "./Database/repositories/pro/ProStandingRepository";
import { ProFavoriteRepository } from "./Database/repositories/pro/ProFavoriteRepository";
import { ChatRepository } from "./Database/repositories/chat/ChatRepository";
import { PredictionRepository } from "./Database/repositories/pickem/PredictionRepository";
import { PickemStatsRepository } from "./Database/repositories/pickem/PickemStatsRepository";
import { UserBadgeRepository } from "./Database/repositories/pickem/UserBadgeRepository";




import { AuthService }   from "./Services/auth/AuthService";
import { UserService }   from "./Services/users/UserService";
import { GameCatalogService } from "./Services/game_catalog/GameCatalogService";
import { TeamService } from "./Services/teams/TeamService";
import { TournamentService } from "./Services/tournaments/TournamentService";
import { MatchService } from "./Services/matches/MatchService";
import { AuditLogService } from "./Services/audit_logs/AuditLogService";
import { HealthService } from "./Services/health/HealthService";
import { MatchStreamService } from "./Services/streams/MatchStreamService";
import { PandaScoreClient } from "./Services/pro/PandaScoreClient";
import { ProSyncService } from "./Services/pro/ProSyncService";
import { ProMatchService } from "./Services/pro/ProMatchService";
import { ProStreamAdminService } from "./Services/pro/ProStreamAdminService";
import { ProStructureSyncService } from "./Services/pro/ProStructureSyncService";
import { ProTournamentService } from "./Services/pro/ProTournamentService";
import { ProFavoriteService } from "./Services/pro/ProFavoriteService";
import { ChatService } from "./Services/chat/ChatService";
import { ChatGateway } from "./WebAPI/realtime/ChatGateway";
import { BadgeService } from "./Services/pickem/BadgeService";
import { PickemService } from "./Services/pickem/PickemService";

import { AuthController }   from "./WebAPI/controllers/AuthController";
import { UserController }   from "./WebAPI/controllers/UserController";
import { GameCatalogController } from "./WebAPI/controllers/GameCatalogController";
import { TeamController } from "./WebAPI/controllers/TeamController";
import { TournamentController } from "./WebAPI/controllers/TournamentController";
import { HealthCheckController } from "./WebAPI/controllers/HealthCheckController";
import { MatchController } from "./WebAPI/controllers/MatchController";
import { AuditLogController } from "./WebAPI/controllers/AuditLogController";
import { StreamController } from "./WebAPI/controllers/StreamController";
import { ProController } from "./WebAPI/controllers/ProController";
import { ProTournamentController } from "./WebAPI/controllers/ProTournamentController";
import { PickemController } from "./WebAPI/controllers/PickemController";







export const logger = new ConsoleLoggerService();
export const db     = new DbManager(logger);

// Repositories
const userRepo   = new UserRepository(db, logger);
const gameCatalogRepo = new GameCatalogRepository(db, logger);
const tournamentRepo = new TournamentRepository(db, logger);
const teamRepo = new TeamRepository(db, logger);
const teamMemberRepo = new TeamMemberRepository(db, logger);
const tournamentRegistrationRepo = new TournamentRegistrationRepository(db, logger);
const gameRepo                   = new GameRepository(db, logger);
const watchlistRepo              = new WatchlistRepository(db, logger);
const matchPlayerRepo = new MatchPlayerRepository(db, logger);
const teamInviteRepo = new TeamInviteRepository(db, logger);
const auditLogRepo = new AuditLogRepository(db, logger);
const matchStreamRepo = new MatchStreamRepository(db, logger);
const proMatchRepo = new ProMatchRepository(db, logger);
const proStreamRepo = new ProStreamRepository(db, logger);
const proLeagueRepo = new ProLeagueRepository(db, logger);
const proSerieRepo = new ProSerieRepository(db, logger);
const proTournamentRepo = new ProTournamentRepository(db, logger);
const proStandingRepo = new ProStandingRepository(db, logger);
const proFavoriteRepo = new ProFavoriteRepository(db, logger);
const chatRepo = new ChatRepository(db, logger);
const predictionRepo = new PredictionRepository(db, logger);
const pickemStatsRepo = new PickemStatsRepository(db, logger);
const userBadgeRepo = new UserBadgeRepository(db, logger);

// Services
const authService   = new AuthService(userRepo);
const userService   = new UserService(userRepo);
const gameCatalogService = new GameCatalogService(gameCatalogRepo, tournamentRepo);
const teamService = new TeamService(teamRepo, teamMemberRepo, teamInviteRepo);
const tournamentService = new TournamentService(
  tournamentRepo,
  tournamentRegistrationRepo,
  teamMemberRepo,
  watchlistRepo,
  gameRepo,
  matchPlayerRepo,
);
const matchService = new MatchService(gameRepo, matchPlayerRepo, teamMemberRepo);
const auditLogService = new AuditLogService(auditLogRepo);
const healthService = new HealthService(db);
const matchStreamService = new MatchStreamService(matchStreamRepo, gameRepo);
const pandaScoreClient = new PandaScoreClient(logger, process.env.PANDASCORE_TOKEN ?? "");
export const proSyncService = new ProSyncService(pandaScoreClient, proMatchRepo, proStreamRepo, logger);
const proMatchService = new ProMatchService(proMatchRepo, proStreamRepo);
const proStreamAdminService = new ProStreamAdminService(proStreamRepo, proMatchRepo);
export const proStructureSyncService = new ProStructureSyncService(pandaScoreClient, proLeagueRepo, proSerieRepo, proTournamentRepo, logger);
const proTournamentService = new ProTournamentService(pandaScoreClient, proLeagueRepo, proSerieRepo, proTournamentRepo, proStandingRepo, proMatchRepo);
const proFavoriteService = new ProFavoriteService(proFavoriteRepo);
const chatService = new ChatService(chatRepo);
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
app.use("/api", new GameCatalogController(gameCatalogService, auditLogService).getRouter());
app.use("/api", new TeamController(teamService).getRouter());
app.use("/api", new TournamentController(tournamentService, auditLogService).getRouter());
app.use("/api", new HealthCheckController(healthService).getRouter());
app.use("/api", new MatchController(matchService).getRouter());
app.use("/api", new AuditLogController(auditLogService).getRouter());
app.use("/api", new StreamController(matchStreamService, auditLogService).getRouter());
app.use("/api", new ProController(proMatchService, proSyncService, proStreamAdminService, auditLogService).getRouter());
app.use("/api", new ProTournamentController(proTournamentService, proStructureSyncService, auditLogService, proFavoriteService).getRouter());
app.use("/api", new PickemController(pickemService).getRouter());

export default app;
