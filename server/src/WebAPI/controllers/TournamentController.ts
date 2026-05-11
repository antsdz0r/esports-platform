import { Router, Request, Response } from "express";
import { ITournamentService } from "../../Domain/services/tournaments/ITournamentService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { UserRole } from "../../Domain/enums/UserRole";
import { TournamentRegistrationStatus } from "../../Domain/enums/TournamentRegistrationStatus";
import { TournamentStatus } from "../../Domain/enums/TournamentStatus";

export class TournamentController {
  private readonly router: Router;

  constructor(private readonly tournamentService: ITournamentService) {
    this.router = Router();
    this.initRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  private initRoutes(): void {
    // ─── Javne rute ────────────────────────────────────────────────────────

    // GET /api/tournaments        → lista svih turnira (filterable: ?gameId=1&status=open)
    this.router.get("/tournaments", this.getAll.bind(this));

    // GET /api/tournaments/:id    → detalji jednog turnira + registracije
    this.router.get("/tournaments/:id", this.getById.bind(this));

    // ─── Admin rute ────────────────────────────────────────────────────────

    // POST /api/tournaments               → kreiranje turnira (admin)
    this.router.post(
      "/tournaments",
      authenticate,
      authorize(UserRole.ADMIN),
      this.create.bind(this)
    );

    // PUT /api/tournaments/:id            → izmena turnira (admin)
    this.router.put(
      "/tournaments/:id",
      authenticate,
      authorize(UserRole.ADMIN),
      this.update.bind(this)
    );

    // DELETE /api/tournaments/:id         → brisanje turnira (admin)
    this.router.delete(
      "/tournaments/:id",
      authenticate,
      authorize(UserRole.ADMIN),
      this.deleteTournament.bind(this)
    );


    this.router.patch(
      "/tournaments/:id/registrations/:teamId",
      authenticate,
      authorize(UserRole.ADMIN),
      this.updateRegistrationStatus.bind(this)
    );


    this.router.post(
      "/tournaments/:id/generate-bracket",
      authenticate,
      authorize(UserRole.ADMIN),
      this.generateBracket.bind(this)
    );

    // ─── Prijavljeni igrač (kapiten) ──────────────────────────────────────

    // POST /api/tournaments/:id/register          → prijava tima na turnir
    this.router.post(
      "/tournaments/:id/register",
      authenticate,
      this.registerTeam.bind(this)
    );


    this.router.delete(
      "/tournaments/:id/register/:teamId",
      authenticate,
      this.unregisterTeam.bind(this)
    );


    this.router.post(
      "/tournaments/:id/watch",
      authenticate,
      this.watchTournament.bind(this)
    );


    this.router.delete(
      "/tournaments/:id/watch",
      authenticate,
      this.unwatchTournament.bind(this)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLER METODE
  // ─────────────────────────────────────────────────────────────────────────

  private async getAll(req: Request, res: Response): Promise<void> {
    const gameId = req.query.gameId ? Number(req.query.gameId) : undefined;
    const status = req.query.status as TournamentStatus | undefined;

    const tournaments = await this.tournamentService.getAll({ gameId, status });
    res.json(tournaments);
  }

  private async getById(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: "Neispravan ID" }); return; }

    const [tournament, registrations] = await Promise.all([
      this.tournamentService.getById(id),
      this.tournamentService.getRegistrations(id),
    ]);

    if (!tournament) { res.status(404).json({ message: "Turnir nije pronađen" }); return; }

    res.json({ ...tournament, registrations });
  }

  private async create(req: Request, res: Response): Promise<void> {
    const { gameId, name, format, maxTeams, registrationDeadline, prizePool } = req.body;

    if (!gameId || !name || !format || !maxTeams || !registrationDeadline) {
      res.status(400).json({ message: "Sva obavezna polja moraju biti popunjena" });
      return;
    }

    const deadline = new Date(registrationDeadline);
    if (isNaN(deadline.getTime())) {
      res.status(400).json({ message: "Neispravan datum roka prijave" });
      return;
    }

    const created = await this.tournamentService.create({
      gameId: Number(gameId),
      name: String(name),
      format: String(format),
      maxTeams: Number(maxTeams),
      registrationDeadline: deadline,
      prizePool: prizePool ? Number(prizePool) : 0,
    });

    if (!created) {
      res.status(400).json({
        message:
          "Kreiranje nije uspelo. Proverite format (single_elim, double_elim, round_robin) " +
          "i da je maxTeams stepen broja 2 za eliminacione formate.",
      });
      return;
    }

    res.status(201).json(created);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const { gameId, name, format, maxTeams, registrationDeadline, prizePool, status } = req.body;

    if (!gameId || !name || !format || !maxTeams || !registrationDeadline) {
      res.status(400).json({ message: "Sva obavezna polja moraju biti popunjena" });
      return;
    }

    const ok = await this.tournamentService.update(id, {
      gameId: Number(gameId),
      name: String(name),
      format: String(format),
      maxTeams: Number(maxTeams),
      registrationDeadline: new Date(registrationDeadline),
      prizePool: prizePool ? Number(prizePool) : undefined,
      status: status as TournamentStatus | undefined,
    });

    ok
      ? res.json({ message: "Turnir uspešno ažuriran" })
      : res.status(400).json({ message: "Ažuriranje nije uspelo" });
  }

  private async deleteTournament(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    const ok = await this.tournamentService.delete(id);

    ok
      ? res.json({ message: "Turnir obrisan" })
      : res.status(404).json({ message: "Turnir nije pronađen" });
  }

  // ─── Prijave ──────────────────────────────────────────────────────────

  private async registerTeam(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const { teamId } = req.body;
    const captainId = (req as any).user?.id;

    if (!teamId || !captainId) {
      res.status(400).json({ message: "teamId je obavezan" });
      return;
    }

    const result = await this.tournamentService.registerTeam(
      tournamentId,
      Number(teamId),
      captainId
    );

    result.ok
      ? res.status(201).json({ message: "Tim prijavljen" })
      : res.status(400).json({ message: result.error });
  }

  private async unregisterTeam(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const teamId = Number(req.params.teamId);
    const captainId = (req as any).user?.id;

    const ok = await this.tournamentService.unregisterTeam(tournamentId, teamId, captainId);

    ok
      ? res.json({ message: "Tim odjavljen" })
      : res.status(400).json({ message: "Odjava nije uspela" });
  }

  private async updateRegistrationStatus(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const teamId = Number(req.params.teamId);
    const { status } = req.body;

    const validStatuses = Object.values(TournamentRegistrationStatus);
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Neispravan status prijave" });
      return;
    }

    const ok = await this.tournamentService.updateRegistrationStatus(
      tournamentId,
      teamId,
      status as TournamentRegistrationStatus
    );

    ok
      ? res.json({ message: "Status prijave ažuriran" })
      : res.status(404).json({ message: "Prijava nije pronađena" });
  }

  private async generateBracket(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const result = await this.tournamentService.lockAndGenerateBracket(tournamentId);

    result.ok
      ? res.json({ message: "Bracket uspešno generisan" })
      : res.status(400).json({ message: result.error });
  }

  // ─── Watchlist ────────────────────────────────────────────────────────

  private async watchTournament(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const userId = (req as any).user?.id;

    const ok = await this.tournamentService.watchTournament(userId, tournamentId);
    ok
      ? res.status(201).json({ message: "Turnir dodat na listu praćenja" })
      : res.status(400).json({ message: "Već praćen ili greška" });
  }

  private async unwatchTournament(req: Request, res: Response): Promise<void> {
    const tournamentId = Number(req.params.id);
    const userId = (req as any).user?.id;

    const ok = await this.tournamentService.unwatchTournament(userId, tournamentId);
    ok
      ? res.json({ message: "Turnir uklonjen sa liste praćenja" })
      : res.status(400).json({ message: "Nije na listi praćenja" });
  }
}