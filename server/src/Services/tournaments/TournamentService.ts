import { Tournament } from "../../Domain/models/Tournament";
import { TournamentDetailed } from "../../Domain/models/TournamentDetailed";
import { TournamentRegistration } from "../../Domain/models/TournamentRegistration";
import { Game } from "../../Domain/models/Game";
import { TournamentFormat } from "../../Domain/enums/TournamentFormat";
import { GameStatus } from "../../Domain/enums/GameStatus";
import { BracketType } from "../../Domain/enums/BracketType";
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

    // Igrač ne sme da se prijavi na turnir kroz dva tima:
    // ako neki član ovog tima već igra za drugi tim koji je prijavljen na turnir, prijava se odbija.
    const registeredTeams = await this.registrationRepo.getTeamsForTournament(tournamentId);
    const otherTeamIds = registeredTeams.map((r) => r.teamId).filter((id) => id !== teamId);
    if (otherTeamIds.length > 0) {
      const myMemberIds = new Set(members.map((m) => m.playerId));
      for (const otherId of otherTeamIds) {
        const otherMembers = await this.teamMemberRepo.getMembersByTeam(otherId);
        if (otherMembers.some((m) => myMemberIds.has(m.playerId))) {
          return { ok: false, error: "Igrač iz ovog tima je već prijavljen na turnir kroz drugi tim" };
        }
      }
    }

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
    const n = confirmed.length;

    if (n < 2) return { ok: false, error: "Potrebna su najmanje 2 tima" };
    if (n % 2 !== 0) return { ok: false, error: "Turnir ne može da počne sa neparnim brojem timova" };

    const isElimination =
      tournament.format === TournamentFormat.SINGLE_ELIM ||
      tournament.format === TournamentFormat.DOUBLE_ELIM;
    if (isElimination && !this.isPowerOfTwo(n)) {
      return { ok: false, error: "Broj timova mora biti stepen broja 2 (2, 4, 8, 16...)" };
    }

    const seeded = [...confirmed].sort(
      (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
    );
    for (let i = 0; i < seeded.length; i++) {
      await this.registrationRepo.updateSeed(tournamentId, seeded[i].teamId, i + 1);
    }

    await this.tournamentRepo.updateStatus(tournamentId, TournamentStatus.LOCKED);
    await this.gameRepo.deleteMatchesForTournament(tournamentId);

    const teamIds = seeded.map((s) => s.teamId);

    if (tournament.format === TournamentFormat.DOUBLE_ELIM) {
      await this.buildDoubleEliminationBracket(tournamentId, teamIds);
    } else {
      await this.buildSingleEliminationBracket(tournamentId, teamIds);
    }

    return { ok: true };
  }

  private async createNode(
    tournamentId: number,
    round: number,
    bracket: BracketType,
    team1Id: number | null,
    team2Id: number | null,
  ): Promise<number> {
    const created = await this.gameRepo.create(
      new Game(0, tournamentId, team1Id, team2Id, round, "0:0", GameStatus.SCHEDULED, null, null, bracket)
    );
    return created.gameId;
  }

  // Standardni single-elimination: pobednici napreduju kroz runde do finala.
  private async buildSingleEliminationBracket(tournamentId: number, teamIds: number[]): Promise<void> {
    const n = teamIds.length;
    const rounds = Math.round(Math.log2(n));
    let prev: number[] = [];

    for (let round = 1; round <= rounds; round++) {
      const count = Math.round(n / Math.pow(2, round));
      const ids: number[] = [];
      for (let i = 0; i < count; i++) {
        const t1 = round === 1 ? teamIds[i] : null;
        const t2 = round === 1 ? teamIds[n - 1 - i] : null;
        ids.push(await this.createNode(tournamentId, round, BracketType.UPPER, t1, t2));
      }
      if (round > 1) {
        for (let j = 0; j < prev.length; j++) {
          await this.gameRepo.setMatchLinks(prev[j], ids[Math.floor(j / 2)], (j % 2) + 1, null, null);
        }
      }
      prev = ids;
    }
    // Finalni meč zadržava winner_to_match = null → pobednik je šampion.
  }

  // Double-elimination: pobednici idu u upper bracket, gubitnici padaju u lower bracket;
  // pobednik lower bracketa igra protiv gubitnika upper finala, pa se ide u grand finale.
  private async buildDoubleEliminationBracket(tournamentId: number, teamIds: number[]): Promise<void> {
    const n = teamIds.length;
    const r = Math.round(Math.log2(n));

    // Upper bracket runde 1..r
    const ub: number[][] = [];
    for (let k = 1; k <= r; k++) {
      const count = Math.round(n / Math.pow(2, k));
      const ids: number[] = [];
      for (let i = 0; i < count; i++) {
        const t1 = k === 1 ? teamIds[i] : null;
        const t2 = k === 1 ? teamIds[n - 1 - i] : null;
        ids.push(await this.createNode(tournamentId, k, BracketType.UPPER, t1, t2));
      }
      ub.push(ids);
    }

    // Lower bracket runde 1..(2r-2)
    const lbRoundCount = 2 * r - 2;
    const lb: number[][] = [];
    for (let lbRound = 1; lbRound <= lbRoundCount; lbRound++) {
      const j = lbRound % 2 === 1 ? (lbRound + 1) / 2 : lbRound / 2;
      const count = Math.round(n / Math.pow(2, j + 1));
      const ids: number[] = [];
      for (let i = 0; i < count; i++) {
        ids.push(await this.createNode(tournamentId, lbRound, BracketType.LOWER, null, null));
      }
      lb.push(ids);
    }

    // Grand finale
    const gfId = await this.createNode(tournamentId, 1, BracketType.GRAND, null, null);

    // Linkovanje upper bracketa (pobednici napred, gubitnici u lower)
    for (let k = 1; k <= r; k++) {
      const ids = ub[k - 1];
      for (let i = 0; i < ids.length; i++) {
        let winnerToMatch: number;
        let winnerToSlot: number;
        if (k < r) {
          winnerToMatch = ub[k][Math.floor(i / 2)];
          winnerToSlot = (i % 2) + 1;
        } else {
          winnerToMatch = gfId; // upper finale → grand finale (slot 1)
          winnerToSlot = 1;
        }

        let loserToMatch: number | null = null;
        let loserToSlot: number | null = null;
        if (k === 1) {
          if (r >= 2) {
            loserToMatch = lb[0][Math.floor(i / 2)];
            loserToSlot = (i % 2) + 1;
          } else {
            loserToMatch = gfId; // n === 2: nema lower bracketa, gubitnik ide u GF (slot 2)
            loserToSlot = 2;
          }
        } else {
          const majorRound = 2 * (k - 1); // 1-based lower-bracket runda koja prima ove gubitnike
          loserToMatch = lb[majorRound - 1][i];
          loserToSlot = 2; // upper "dropdown" zauzima slot 2
        }

        await this.gameRepo.setMatchLinks(ids[i], winnerToMatch, winnerToSlot, loserToMatch, loserToSlot);
      }
    }

    // Linkovanje lower bracketa
    for (let lbRound = 1; lbRound <= lbRoundCount; lbRound++) {
      const ids = lb[lbRound - 1];
      for (let i = 0; i < ids.length; i++) {
        let winnerToMatch: number;
        let winnerToSlot: number;
        if (lbRound === lbRoundCount) {
          winnerToMatch = gfId; // lower finale → grand finale (slot 2)
          winnerToSlot = 2;
        } else if (lbRound % 2 === 1) {
          // minor runda → pobednik ide u sledeću major rundu (slot 1)
          winnerToMatch = lb[lbRound][i];
          winnerToSlot = 1;
        } else {
          // major runda → pobednici se spajaju u sledeću minor rundu
          winnerToMatch = lb[lbRound][Math.floor(i / 2)];
          winnerToSlot = (i % 2) + 1;
        }
        await this.gameRepo.setMatchLinks(ids[i], winnerToMatch, winnerToSlot, null, null);
      }
    }

    // Grand finale zadržava winner_to_match = null → pobednik je šampion.
  }

  // Ručno napredovanje bracketa (admin "Sledeća runda"): za svaki završen meč
  // upisuje pobednika u njegov sledeći meč, a gubitnika (kod double-elim) u lower bracket.
  // Idempotentno je — popunjava samo prazne slotove, pa služi i kao "popravka" zaglavljenog bracketa.
  async advanceBracket(tournamentId: number): Promise<{ ok: boolean; error?: string; advanced?: number }> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (tournament.tournamentId === 0) return { ok: false, error: "Turnir ne postoji" };

    const listedGames = await this.gameRepo.findByTournamentId(tournamentId);
    if (listedGames.length === 0) return { ok: false, error: "Bracket još nije generisan" };

    let advanced = 0;
    let championDecided = false;

    for (const listed of listedGames) {
      // svež pregled sa mastera (linkovi + trenutni slotovi ciljnih mečeva)
      const g = await this.gameRepo.findByIdMaster(listed.gameId);
      if (g.status !== GameStatus.COMPLETED || g.winnerTeamId === null) continue;

      const loserTeamId = g.winnerTeamId === g.team1Id ? g.team2Id : g.team1Id;

      if (g.winnerToMatch !== null) {
        const slot = g.winnerToSlot ?? 1;
        const target = await this.gameRepo.findByIdMaster(g.winnerToMatch);
        const current = slot === 1 ? target.team1Id : target.team2Id;
        if (target.gameId !== 0 && current === null) {
          await this.gameRepo.placeTeamInMatch(g.winnerToMatch, slot, g.winnerTeamId);
          advanced++;
        }
      } else {
        // Meč bez sledećeg meča je finale — pobednik je šampion.
        championDecided = true;
      }

      if (g.loserToMatch !== null && loserTeamId !== null) {
        const slot = g.loserToSlot ?? 2;
        const target = await this.gameRepo.findByIdMaster(g.loserToMatch);
        const current = slot === 1 ? target.team1Id : target.team2Id;
        if (target.gameId !== 0 && current === null) {
          await this.gameRepo.placeTeamInMatch(g.loserToMatch, slot, loserTeamId);
          advanced++;
        }
      }
    }

    if (championDecided) {
      await this.tournamentRepo.updateStatus(tournamentId, TournamentStatus.COMPLETED);
    }

    if (advanced === 0 && !championDecided) {
      return { ok: false, error: "Nema timova za napredovanje — prvo završi sve mečeve trenutne runde" };
    }

    return { ok: true, advanced };
  }

  async recordMatchResult(
    gameId: number,
    score: string,
    winnerTeamId: number
  ): Promise<{ ok: boolean; error?: string }> {
    // Cita se sa mastera da bi winner/loser linkovi bili sveži (read-modify-write).
    const game = await this.gameRepo.findByIdMaster(gameId);
    if (game.gameId === 0) return { ok: false, error: "Meč ne postoji" };

    // Validacija rezultata i pobednika
    const scoreParts = score.split(":");
    const scoreA = parseInt(scoreParts[0], 10);
    const scoreB = parseInt(scoreParts[1], 10);
    if (scoreParts.length !== 2 || isNaN(scoreA) || isNaN(scoreB)) {
      return { ok: false, error: "Neispravan format rezultata (npr. 2:0)" };
    }
    if (scoreA === scoreB) {
      return { ok: false, error: "Rezultat ne može biti nerešen — pobednik mora biti jasan" };
    }
    if (winnerTeamId !== game.team1Id && winnerTeamId !== game.team2Id) {
      return { ok: false, error: "Pobednik mora biti jedan od timova u meču" };
    }
    const winnerIsTeam1 = winnerTeamId === game.team1Id;
    const team1HasHigherScore = scoreA > scoreB;
    if (winnerIsTeam1 !== team1HasHigherScore) {
      return { ok: false, error: "Rezultat ne odgovara pobedniku — pobednik mora imati veći skor" };
    }

    const ok = await this.gameRepo.updateResult(gameId, score, winnerTeamId, GameStatus.COMPLETED);
    if (!ok) return { ok: false, error: "Azuriranje nije uspelo" };

    const team1Id = game.team1Id;
    const team2Id = game.team2Id;

    if (team1Id !== null && team2Id !== null) {
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
      if (scoreA + scoreB > 0) {
        const winnerScore = winnerTeamId === team1Id ? scoreA : scoreB;
        const loserScore = winnerTeamId === team1Id ? scoreB : scoreA;
        winnerKillShare = 0.45 + 0.35 * (winnerScore / (winnerScore + loserScore + 1));
      }

      const winnerKills = Math.round(totalKills * winnerKillShare);
      const loserKills = totalKills - winnerKills;

      const winnerMembers = winnerTeamId === team1Id ? team1Members : team2Members;
      const loserMembers = winnerTeamId === team1Id ? team2Members : team1Members;

      const distribute = (total: number, count: number): number[] => {
        if (count === 0) return [];
        const weights = Array.from({ length: count }, () => Math.random() + 0.3);
        const sum = weights.reduce((acc, w) => acc + w, 0);
        const raw = weights.map((w) => Math.round((w / sum) * total));
        const diff = total - raw.reduce((acc, w) => acc + w, 0);
        raw[0] += diff;
        return raw;
      };

      const winnerKillDist = distribute(winnerKills, winnerMembers.length);
      const loserKillDist = distribute(loserKills, loserMembers.length);
      const winnerDeathDist = distribute(loserKills, winnerMembers.length);
      const loserDeathDist = distribute(winnerKills, loserMembers.length);

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

    // Napredovanje kroz bracket prema unapred izgrađenim linkovima
    const loserTeamId = winnerTeamId === team1Id ? team2Id : team1Id;

    if (game.winnerToMatch !== null) {
      await this.gameRepo.placeTeamInMatch(game.winnerToMatch, game.winnerToSlot ?? 1, winnerTeamId);
    } else {
      // Nema sledećeg meča → pobednik je šampion → turnir je završen.
      await this.tournamentRepo.updateStatus(game.tournamentId, TournamentStatus.COMPLETED);
    }

    if (game.loserToMatch !== null && loserTeamId !== null) {
      await this.gameRepo.placeTeamInMatch(game.loserToMatch, game.loserToSlot ?? 2, loserTeamId);
    }

    return { ok: true };
  }
}
