import { Router, Request, Response } from "express";
import { ITournamentService } from "../../Domain/services/tournaments/ITournamentService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { UserRole } from "../../Domain/enums/UserRole";
import { TournamentRegistrationStatus } from "../../Domain/enums/TournamentRegistrationStatus";
import { TournamentStatus } from "../../Domain/enums/TournamentStatus";
import { validateTournament } from "../validators/tournaments/validateTournaments";
import { validateMatchScore } from "../validators/score/validateMatchScore";
import { CreateTournamentData } from "../../Domain/models/CreateTournamentData";
import { UpdateTournamentData } from "../../Domain/models/UpdateTournamentData";
import { TournamentFormat } from "../../Domain/enums/TournamentFormat";

export class TournamentController {
  private readonly router: Router;

  constructor(
    private readonly tournamentService: ITournamentService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router = Router();
    this.initRoutes();
  }

  getRouter(): Router { return this.router; }

  private initRoutes(): void {
    this.router.get("/tournaments", this.getAll.bind(this));
    this.router.get("/tournaments/watchlist/my", authenticate, this.getMyWatchlist.bind(this));
    this.router.get("/tournaments/my-registrations", authenticate, this.getMyRegistrations.bind(this));
    this.router.get("/tournaments/:id", this.getById.bind(this));

    this.router.post("/tournaments", authenticate, authorize(UserRole.ADMIN), this.create.bind(this));
    this.router.put("/tournaments/:id", authenticate, authorize(UserRole.ADMIN), this.update.bind(this));
    this.router.delete("/tournaments/:id", authenticate, authorize(UserRole.ADMIN), this.deleteTournament.bind(this));
    this.router.patch("/tournaments/:id/registrations/:teamId", authenticate, authorize(UserRole.ADMIN), this.updateRegistrationStatus.bind(this));
    this.router.post("/tournaments/:id/generate-bracket", authenticate, authorize(UserRole.ADMIN), this.generateBracket.bind(this));
    this.router.patch("/tournaments/games/:gameId/result", authenticate, authorize(UserRole.ADMIN), this.recordMatchResult.bind(this));

    this.router.post("/tournaments/:id/register", authenticate, this.registerTeam.bind(this));
    this.router.delete("/tournaments/:id/register/:teamId", authenticate, this.unregisterTeam.bind(this));
    this.router.post("/tournaments/:id/watch", authenticate, this.watchTournament.bind(this));
    this.router.delete("/tournaments/:id/watch", authenticate, this.unwatchTournament.bind(this));
  }

  private async getAll(req: Request, res: Response): Promise<void> {
    try {
      const gameId = req.query.gameId ? Number(req.query.gameId) : undefined;
      const status = req.query.status as TournamentStatus | undefined;
      const tournaments = await this.tournamentService.getAllDetailed({ gameId, status });
      res.json({ success: true, data: tournaments });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getMyWatchlist(req: Request, res: Response): Promise<void> {
    try {
      const tournaments = await this.tournamentService.getMyWatchlist(req.user!.id);
      res.json({ success: true, data: tournaments });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getMyRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const regs = await this.tournamentService.getMyRegistrations(req.user!.id);
      res.json({ success: true, data: regs });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) { res.status(400).json({ message: "Neispravan ID" }); return; }
      const [tournament, registrations] = await Promise.all([
        this.tournamentService.getById(id),
        this.tournamentService.getRegistrations(id),
      ]);
      if (tournament.tournamentId === 0) { res.status(404).json({ message: "Turnir nije pronađen" }); return; }
      res.json({ ...tournament, registrations });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, name, format, maxTeams, registrationDeadline, prizePool, imageUrl } = req.body;
      const deadline = new Date(registrationDeadline);
      if (isNaN(deadline.getTime())) { res.status(400).json({ message: "Neispravan datum roka prijave" }); return; }
      const validation = validateTournament(name, format, Number(maxTeams), deadline);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }
      const created = await this.tournamentService.create(
        new CreateTournamentData(Number(gameId), String(name), String(format) as TournamentFormat, Number(maxTeams), deadline, prizePool ? Number(prizePool) : 0, imageUrl ? String(imageUrl) : null)
      );
      if (!created.ok) { res.status(400).json({ message: created.error ?? "Kreiranje nije uspelo" }); return; }
      await this.auditLogService.log(req.user?.id ?? null, "CREATE_TOURNAMENT", "tournament", created.tournament?.tournamentId ?? null, `Kreiran turnir: ${name}`, req.socket.remoteAddress ?? null);
      res.status(201).json(created.tournament);
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { gameId, name, format, maxTeams, registrationDeadline, prizePool, status, imageUrl } = req.body;
      const deadline = new Date(registrationDeadline);
      if (isNaN(deadline.getTime())) { res.status(400).json({ message: "Neispravan datum roka prijave" }); return; }
      const validation = validateTournament(name, format, Number(maxTeams), deadline);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }
      const ok = await this.tournamentService.update(id,
        new UpdateTournamentData(Number(gameId), String(name), String(format) as TournamentFormat, Number(maxTeams), deadline, prizePool ? Number(prizePool) : 0, status as TournamentStatus ?? TournamentStatus.OPEN, imageUrl ? String(imageUrl) : null)
      );
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "UPDATE_TOURNAMENT", "tournament", id, `Izmenjen turnir #${id}`, req.socket.remoteAddress ?? null);
      ok ? res.json({ message: "Turnir uspešno ažuriran" }) : res.status(400).json({ message: "Ažuriranje nije uspelo" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async deleteTournament(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = Number(req.params.id);
      const ok = await this.tournamentService.delete(tournamentId);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "DELETE_TOURNAMENT", "tournament", tournamentId, `Obrisan turnir #${tournamentId}`, req.socket.remoteAddress ?? null);
      ok ? res.json({ message: "Turnir obrisan" }) : res.status(404).json({ message: "Turnir nije pronađen" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async registerTeam(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = Number(req.params.id);
      const { teamId } = req.body;
      if (!teamId) { res.status(400).json({ message: "teamId je obavezan" }); return; }
      const result = await this.tournamentService.registerTeam(tournamentId, Number(teamId), req.user!.id);
      result.ok ? res.status(201).json({ message: "Tim prijavljen" }) : res.status(400).json({ message: result.error });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async unregisterTeam(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = Number(req.params.id);
      const teamId = Number(req.params.teamId);
      const ok = await this.tournamentService.unregisterTeam(tournamentId, teamId, req.user!.id);
      ok ? res.json({ message: "Tim odjavljen" }) : res.status(400).json({ message: "Odjava nije uspela" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async updateRegistrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = Number(req.params.id);
      const teamId = Number(req.params.teamId);
      const { status } = req.body;
      if (!Object.values(TournamentRegistrationStatus).includes(status)) {
        res.status(400).json({ message: "Neispravan status prijave" }); return;
      }
      const ok = await this.tournamentService.updateRegistrationStatus(tournamentId, teamId, status as TournamentRegistrationStatus);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "UPDATE_REGISTRATION", "tournament", tournamentId, `Prijava tima #${teamId} -> ${status} (turnir #${tournamentId})`, req.socket.remoteAddress ?? null);
      ok ? res.json({ message: "Status prijave ažuriran" }) : res.status(404).json({ message: "Prijava nije pronađena" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async generateBracket(req: Request, res: Response): Promise<void> {
    try {
      const tournamentId = Number(req.params.id);
      const result = await this.tournamentService.lockAndGenerateBracket(tournamentId);
      if (result.ok) await this.auditLogService.log(req.user?.id ?? null, "GENERATE_BRACKET", "tournament", tournamentId, `Generisan raspored za turnir #${tournamentId}`, req.socket.remoteAddress ?? null);
      result.ok ? res.json({ message: "Bracket uspešno generisan" }) : res.status(400).json({ message: result.error });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async recordMatchResult(req: Request, res: Response): Promise<void> {
    try {
      const gameId = Number(req.params.gameId);
      const { score, winnerTeamId } = req.body;
      const validation = validateMatchScore(score);
      if (!validation.valid) { res.status(400).json({ success: false, message: validation.message }); return; }
      const result = await this.tournamentService.recordMatchResult(gameId, score, Number(winnerTeamId));
      if (result.ok) await this.auditLogService.log(req.user?.id ?? null, "RECORD_RESULT", "match", gameId, `Rezultat meča #${gameId}: ${score} (pobednik tim #${winnerTeamId})`, req.socket.remoteAddress ?? null);
      result.ok ? res.json({ message: "Rezultat uspešno zabeležen" }) : res.status(400).json({ message: result.error });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async watchTournament(req: Request, res: Response): Promise<void> {
    try {
      const ok = await this.tournamentService.watchTournament(req.user!.id, Number(req.params.id));
      ok ? res.status(201).json({ message: "Turnir dodat na listu praćenja" }) : res.status(400).json({ message: "Već praćen ili greška" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async unwatchTournament(req: Request, res: Response): Promise<void> {
    try {
      const ok = await this.tournamentService.unwatchTournament(req.user!.id, Number(req.params.id));
      ok ? res.json({ message: "Turnir uklonjen sa liste praćenja" }) : res.status(400).json({ message: "Greška" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}
