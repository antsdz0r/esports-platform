import { Tournament } from "../../Domain/models/Tournament";
import { TournamentDetailed } from "../../Domain/models/TournamentDetailed";
import { TournamentRegistration } from "../../Domain/models/TournamentRegistration";
import { TournamentFormat } from "../../Domain/enums/TournamentFormat";
import { TournamentStatus } from "../../Domain/enums/TournamentStatus";
import { TournamentRegistrationStatus } from "../../Domain/enums/TournamentRegistrationStatus";
import { ITournamentRepository } from "../../Domain/repositories/tournaments/ITournamentRepository";
import { ITournamentRegistrationRepository } from "../../Domain/repositories/tournament_registration/ITournamentRegistrationRepository";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { IWatchlistRepository } from "../../Domain/repositories/watchlist/IWatchListRepository";
import { IGameRepository } from "../../Domain/repositories/games/IGameRepository";
import { TeamMemberRole } from "../../Domain/enums/TeamMemberRole";
import { ITournamentService } from "../../Domain/services/tournaments/ITournamentService";
import { CreateTournamentData } from "../../Domain/models/CreateTournamentData";
import { UpdateTournamentData } from "../../Domain/models/UpdateTournamentData";

export class TournamentService implements ITournamentService {
  constructor(
    private readonly tournamentRepo: ITournamentRepository,
    private readonly registrationRepo: ITournamentRegistrationRepository,
    private readonly teamMemberRepo: ITeamMemberRepository,
    private readonly watchlistRepo: IWatchlistRepository,
    private readonly gameRepo: IGameRepository,
  ) {}

  async getAll(filters?: { gameId?: number; status?: TournamentStatus }): Promise<Tournament[]> {
    let all: Tournament[];
    if (filters?.gameId) {
      all = await this.tournamentRepo.findByGameId(filters.gameId);
    } else {
      all = await this.tournamentRepo.findAll();
    }
    if (filters?.status) {
      all = all.filter((t) => t.status === filters.status);
    }
    return all;
  }

  async getAllDetailed(filters?: { gameId?: number; status?: TournamentStatus }): Promise<TournamentDetailed[]> {
    return this.tournamentRepo.findAllDetailed(filters);
  }

  async getMyWatchlist(userId: number): Promise<TournamentDetailed[]> {
    const ids = await this.watchlistRepo.getByUser(userId);
    if (ids.length === 0) return [];

    const all = await this.tournamentRepo.findAllDetailed();
    return all.filter((t) => ids.includes(t.tournamentId));
  }

  async getById(id: number): Promise<Tournament> {
    return this.tournamentRepo.findById(id);
  }

  async create(data: CreateTournamentData): Promise<{ ok: boolean; tournament?: Tournament; error?: string }> {
    const validFormats = Object.values(TournamentFormat) as string[];
    if (!validFormats.includes(data.format)) return { ok: false, error: "Neispravan format" };
    if (data.format !== TournamentFormat.ROUND_ROBIN && !this.isPowerOfTwo(data.maxTeams)) return { ok: false, error: "Broj timova mora biti stepen broja 2" };
    if (data.registrationDeadline <= new Date()) return { ok: false, error: "Rok prijave mora biti u budućnosti" };

    const tournament = new Tournament(
      0, data.gameId, data.name, data.format,
      data.maxTeams, data.registrationDeadline,
      data.prizePool, TournamentStatus.OPEN
    );
    const created = await this.tournamentRepo.create(tournament);
    return created.tournamentId === 0
      ? { ok: false, error: "Greška pri kreiranju turnira" }
      : { ok: true, tournament: created };
    }

  async update(id: number, data: UpdateTournamentData): Promise<boolean> {
    const existing = await this.tournamentRepo.findById(id);
    if (existing.tournamentId === 0) return false;
    const validFormats = Object.values(TournamentFormat) as string[];
    if (!validFormats.includes(data.format)) return false;
    const updated = new Tournament(
      id, data.gameId, data.name, data.format,
      data.maxTeams, data.registrationDeadline,
      data.prizePool, data.status
    );
    return this.tournamentRepo.update(updated);
  }

  async delete(id: number): Promise<boolean> {
    const exists = await this.tournamentRepo.exists(id);
    if (!exists) return false;
    return this.tournamentRepo.delete(id);
  }

  async registerTeam(tournamentId: number, teamId: number, captainId: number): Promise<{ ok: boolean; error?: string }> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (tournament.tournamentId === 0) return { ok: false, error: "Turnir ne postoji" };
    if (tournament.status !== TournamentStatus.OPEN) return { ok: false, error: "Prijave su zatvorene" };
    if (new Date() > tournament.registrationDeadLine) return { ok: false, error: "Rok prijave je istekao" };
    const alreadyRegistered = await this.registrationRepo.exists(tournamentId, teamId);
    if (alreadyRegistered) return { ok: false, error: "Tim je već prijavljen" };
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some((m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN);
    if (!isCaptain) return { ok: false, error: "Samo kapiten može prijaviti tim" };
    if (members.length < 1) return { ok: false, error: "Tim nema dovoljno članova" };
    const reg = new TournamentRegistration(tournamentId, teamId, new Date(), TournamentRegistrationStatus.PENDING, null);
    const ok = await this.registrationRepo.registerTeam(reg);
    return ok ? { ok: true } : { ok: false, error: "Greška pri prijavi" };
  }

  async unregisterTeam(tournamentId: number, teamId: number, captainId: number): Promise<boolean> {
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some((m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN);
    if (!isCaptain) return false;
    return this.registrationRepo.removeRegistration(tournamentId, teamId);
  }

  async getRegistrations(tournamentId: number): Promise<TournamentRegistration[]> {
    return this.registrationRepo.getTeamsForTournament(tournamentId);
  }

  async updateRegistrationStatus(tournamentId: number, teamId: number, status: TournamentRegistrationStatus): Promise<boolean> {
    const exists = await this.registrationRepo.exists(tournamentId, teamId);
    if (!exists) return false;
    return this.registrationRepo.updateStatus(tournamentId, teamId, status);
  }

  async watchTournament(userId: number, tournamentId: number): Promise<boolean> {
    const exists = await this.watchlistRepo.exists(userId, tournamentId);
    if (exists) return false;
    return this.watchlistRepo.add(userId, tournamentId);
  }

  async unwatchTournament(userId: number, tournamentId: number): Promise<boolean> {
    return this.watchlistRepo.remove(userId, tournamentId);
  }

  async lockAndGenerateBracket(tournamentId: number): Promise<{ ok: boolean; error?: string }> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (tournament.tournamentId === 0) return { ok: false, error: "Turnir ne postoji" };
    if (tournament.status !== TournamentStatus.OPEN) return { ok: false, error: "Bracket je već generisan ili turnir nije otvoren" };

    const registrations = await this.registrationRepo.getTeamsForTournament(tournamentId);

    // Auto-confirm all pending registrations so admin doesn't need a separate approval step
    for (const reg of registrations) {
      if (reg.status === TournamentRegistrationStatus.PENDING) {
        await this.registrationRepo.updateStatus(tournamentId, reg.teamId, TournamentRegistrationStatus.CONFIRMED);
        reg.status = TournamentRegistrationStatus.CONFIRMED;
      }
    }

    const confirmed = registrations.filter((r) => r.status === TournamentRegistrationStatus.CONFIRMED);
    if (confirmed.length < 2) return { ok: false, error: "Potrebna su najmanje 2 tima" };

    const shuffled = [...confirmed].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await this.registrationRepo.updateSeed(tournamentId, shuffled[i].teamId, i + 1);
    }

    await this.tournamentRepo.updateStatus(tournamentId, TournamentStatus.LOCKED);
    await this.gameRepo.deleteMatchesForTournament(tournamentId);

    for (let i = 0; i < shuffled.length; i += 2) {
      const team1 = shuffled[i]?.teamId ?? null;
      const team2 = shuffled[i + 1]?.teamId ?? null;
      await this.gameRepo.createMatch(tournamentId, team1, team2, 1);
    }

    return { ok: true };
  }


  async recordMatchResult(
    gameId: number,
    score: string,
    winnerTeamId: number
    ): Promise<{ ok: boolean; error?: string }> {
    
    const ok = await this.gameRepo.updateResult(gameId, score, winnerTeamId);
    return ok ? { ok: true } : { ok: false, error: "Ažuriranje nije uspelo" };
  }

  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }
}