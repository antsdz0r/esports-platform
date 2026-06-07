import { Tournament } from "../../Domain/models/Tournament";
import { TournamentDetailed } from "../../Domain/models/TournamentDetailed";
import { TournamentRegistration } from "../../Domain/models/TournamentRegistration";
import { TournamentFormat } from "../../Domain/enums/TournamentFormat";
import { GameStatus } from "../../Domain/enums/GameStatus";
import { TournamentStatus } from "../../Domain/enums/TournamentStatus";
import { TournamentRegistrationStatus } from "../../Domain/enums/TournamentRegistrationStatus";
import { ITournamentRepository } from "../../Domain/repositories/tournaments/ITournamentRepository";
import { ITournamentRegistrationRepository } from "../../Domain/repositories/tournament_registration/ITournamentRegistrationRepository";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { IWatchlistRepository } from "../../Domain/repositories/watchlist/IWatchListRepository";
import { IGameRepository } from "../../Domain/repositories/games/IGameRepository";
import { IMatchPlayerRepository } from "../../Domain/repositories/match_players/IMatchPlayerRepository";
import { MatchPlayer } from "../../Domain/models/MatchPlayer";
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
    private readonly matchPlayerRepo: IMatchPlayerRepository,
  ) {}

  private isPowerOfTwo(n: number): boolean {
    return n >= 2 && (n & (n - 1)) === 0;
  }

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
    if (data.format !== TournamentFormat.ROUND_ROBIN && !this.isPowerOfTwo(data.maxTeams))
      return { ok: false, error: "Broj timova mora biti stepen broja 2" };
    if (data.registrationDeadline <= new Date()) return { ok: false, error: "Rok prijave mora biti u buducnosti" };

    const tournament = new Tournament(
      0, data.gameId, data.name, data.format,
      data.maxTeams, data.registrationDeadline,
      data.prizePool, TournamentStatus.OPEN,
      null, data.imageUrl ?? null
    );
    const created = await this.tournamentRepo.create(tournament);
    return created.tournamentId === 0
      ? { ok: false, error: "Greska pri kreiranju turnira" }
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
      data.prizePool, data.status,
      null, data.imageUrl ?? null
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
    if (alreadyRegistered) return { ok: false, error: "Tim je vec prijavljen" };
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some((m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN);
    if (!isCaptain) return { ok: false, error: "Samo kapiten moze prijaviti tim" };
    if (members.length < 1) return { ok: false, error: "Tim nema dovoljno clanova" };
    const reg = new TournamentRegistration(tournamentId, teamId, new Date(), TournamentRegistrationStatus.PENDING, null);
    const ok = await this.registrationRepo.registerTeam(reg);
    return ok ? { ok: true } : { ok: false, error: "Greska pri prijavi" };
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

  async getMyRegistrations(userId: number): Promise<{ tournamentId: number; teamId: number }[]> {
    const memberships = await this.teamMemberRepo.getTeamsByPlayer(userId);
    const captainTeamIds = memberships
      .filter((m) => m.role === TeamMemberRole.CAPTAIN)
      .map((m) => m.TeamId);
    if (captainTeamIds.length === 0) return [];
    const allRegs = await Promise.all(
      captainTeamIds.map((teamId) => this.registrationRepo.getTournamentsForTeam(teamId))
    );
    return allRegs.flat().map((r) => ({ tournamentId: r.tournamentId, teamId: r.teamId }));
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
    if (tournament.status !== TournamentStatus.OPEN)
      return { ok: false, error: "Bracket je vec generisan ili turnir nije otvoren" };

    const registrations = await this.registrationRepo.getTeamsForTournament(tournamentId);

    for (const reg of registrations) {
      if (reg.status === TournamentRegistrationStatus.PENDING) {
        await this.registrationRepo.updateStatus(tournamentId, reg.teamId, TournamentRegistrationStatus.CONFIRMED);
        reg.status = TournamentRegistrationStatus.CONFIRMED;
      }
    }

    const confirmed = registrations.filter((r) => r.status === TournamentRegistrationStatus.CONFIRMED);
    if (confirmed.length < 2) return { ok: false, error: "Potrebna su najmanje 2 tima" };

    const seeded = [...confirmed].sort(
      (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    );
    for (let i = 0; i < seeded.length; i++) {
      await this.registrationRepo.updateSeed(tournamentId, seeded[i].teamId, i + 1);
    }

    await this.tournamentRepo.updateStatus(tournamentId, TournamentStatus.LOCKED);
    await this.gameRepo.deleteMatchesForTournament(tournamentId);

    const n = seeded.length;
    for (let i = 0; i < Math.ceil(n / 2); i++) {
      const top = seeded[i].teamId;
      const bot = seeded[n - 1 - i]?.teamId ?? null;
      await this.gameRepo.createMatch(tournamentId, top, bot, 1);
    }

    return { ok: true };
  }

  async recordMatchResult(
    gameId: number,
    score: string,
    winnerTeamId: number
  ): Promise<{ ok: boolean; error?: string }> {
    const ok = await this.gameRepo.updateResult(gameId, score, winnerTeamId, GameStatus.COMPLETED);
    if (!ok) return { ok: false, error: "Azuriranje nije uspelo" };

    const game = await this.gameRepo.findById(gameId);
    const team1Id = game.team1Id;
    const team2Id = game.team2Id;

    if (team1Id !== null && team2Id !== null) {
      const loserTeamId = winnerTeamId === team1Id ? team2Id : team1Id;
      void loserTeamId;

      const [team1Members, team2Members] = await Promise.all([
        this.teamMemberRepo.getMembersByTeam(team1Id),
        this.teamMemberRepo.getMembersByTeam(team2Id),
      ]);

      for (const m of team1Members) {
        const exists = await this.matchPlayerRepo.exists(gameId, m.playerId);
        if (!exists) await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, m.playerId, team1Id, null));
      }
      for (const m of team2Members) {
        const exists = await this.matchPlayerRepo.exists(gameId, m.playerId);
        if (!exists) await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, m.playerId, team2Id, null));
      }

      const totalKills = 35 + Math.floor(Math.random() * 16);
      let winnerKillShare = 0.6;
      const parts = score.split(":");
      if (parts.length === 2) {
        const a = parseInt(parts[0], 10);
        const b = parseInt(parts[1], 10);
        if (!isNaN(a) && !isNaN(b) && a + b > 0) {
          const winnerScore = winnerTeamId === team1Id ? a : b;
          const loserScore  = winnerTeamId === team1Id ? b : a;
          winnerKillShare = 0.45 + 0.35 * (winnerScore / (winnerScore + loserScore + 1));
        }
      }

      const winnerKills = Math.round(totalKills * winnerKillShare);
      const loserKills  = totalKills - winnerKills;

      const winnerMembers = winnerTeamId === team1Id ? team1Members : team2Members;
      const loserMembers  = winnerTeamId === team1Id ? team2Members : team1Members;

      const distribute = (total: number, count: number): number[] => {
        if (count === 0) return [];
        const weights = Array.from({ length: count }, () => Math.random() + 0.3);
        const sum = weights.reduce((a, b) => a + b, 0);
        const raw = weights.map(w => Math.round((w / sum) * total));
        const diff = total - raw.reduce((a, b) => a + b, 0);
        raw[0] += diff;
        return raw;
      };

      const winnerKillDist  = distribute(winnerKills, winnerMembers.length);
      const loserKillDist   = distribute(loserKills,  loserMembers.length);
      const winnerDeathDist = distribute(loserKills,  winnerMembers.length);
      const loserDeathDist  = distribute(winnerKills, loserMembers.length);

      for (let i = 0; i < winnerMembers.length; i++) {
        const k = winnerKillDist[i] ?? 0;
        const d = winnerDeathDist[i] ?? 0;
        await this.matchPlayerRepo.updatePerformance(gameId, winnerMembers[i].playerId, `K:${k} D:${d}`);
      }
      for (let i = 0; i < loserMembers.length; i++) {
        const k = loserKillDist[i] ?? 0;
        const d = loserDeathDist[i] ?? 0;
        await this.matchPlayerRepo.updatePerformance(gameId, loserMembers[i].playerId, `K:${k} D:${d}`);
      }
    }

    const allGames = await this.gameRepo.findByTournamentId(game.tournamentId);
    const completedGame = allGames.find(g => g.gameId === gameId);
    if (!completedGame) return { ok: true };

    const { tournamentId, round } = completedGame;
    const roundGames = allGames.filter(g => g.round === round);

    const allDone = roundGames.every(
      g => g.winnerTeamId !== null || g.gameId === gameId
    );
    if (!allDone) return { ok: true };

    const winners = roundGames
      .sort((a, b) => a.gameId - b.gameId)
      .map(g => g.gameId === gameId ? winnerTeamId : g.winnerTeamId)
      .filter((id): id is number => id !== null);

    if (winners.length === 1) {
      await this.tournamentRepo.updateStatus(tournamentId, TournamentStatus.COMPLETED);
      return { ok: true };
    }

    const nextRound = round + 1;
    for (let i = 0; i < winners.length; i += 2) {
      const t1 = winners[i];
      const t2 = winners[i + 1] ?? null;
      await this.gameRepo.createMatch(tournamentId, t1, t2, nextRound);
    }

    return { ok: true };
  }
}
