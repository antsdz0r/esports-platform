import "dotenv/config";
import express from "express";
import cors from "cors";

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




import { AuthService }   from "./Services/auth/AuthService";
import { UserService }   from "./Services/users/UserService";
import { GameCatalogService } from "./Services/game_catalog/GameCatalogService";
import { TeamService } from "./Services/teams/TeamService";
import { TournamentService } from "./Services/tournaments/TournamentService";
import { MatchService } from "./Services/matches/MatchService";

import { AuthController }   from "./WebAPI/controllers/AuthController";
import { UserController }   from "./WebAPI/controllers/UserController";
import { GameCatalogController } from "./WebAPI/controllers/GameCatalogController";
import { TeamController } from "./WebAPI/controllers/TeamController";
import { TournamentController } from "./WebAPI/controllers/TournamentController";
import { HealthCheckController } from "./WebAPI/controllers/HealthCheckController";
import { MatchController } from "./WebAPI/controllers/MatchController";


import { authenticate } from "./Middlewares/authentification/AuthMiddleware";
import { authorize } from "./Middlewares/authorization/AuthorizeMiddleware";
import { User } from "./Domain/models/User";
import { UserRole } from "./Domain/enums/UserRole";




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

// Services
const authService   = new AuthService(userRepo);
const userService   = new UserService(userRepo);
const gameCatalogService = new GameCatalogService(gameCatalogRepo, tournamentRepo);
const teamService = new TeamService(teamRepo, teamMemberRepo, teamInviteRepo);
const tournamentService = new TournamentService(
  tournamentRepo,               // ITournamentRepository (već postoji)
  tournamentRegistrationRepo,   // ITournamentRegistrationRepository
  teamMemberRepo,               // ITeamMemberRepository (već postoji)
  watchlistRepo,                // IWatchlistRepository
  gameRepo                      // IGameRepository
);
const matchService = new MatchService(gameRepo, matchPlayerRepo, teamMemberRepo);
// Express
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ?? "*" }));
app.use(express.json());

app.use("/api", new AuthController(authService).getRouter());
app.use("/api", new UserController(userService).getRouter());
app.use("/api", new GameCatalogController(gameCatalogService).getRouter());
app.use("/api", new TeamController(teamService).getRouter());
app.use("/api", new TournamentController(tournamentService).getRouter());
app.use("/api", new HealthCheckController().getRouter());
app.use("/api", new MatchController(matchService).getRouter());



export default app;
