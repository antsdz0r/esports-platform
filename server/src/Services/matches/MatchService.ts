import { IMatchService } from "../../Domain/services/matches/IMatchService";
import { IGameRepository } from "../../Domain/repositories/games/IGameRepository";
import { IMatchPlayerRepository } from "../../Domain/repositories/match_players/IMatchPlayerRepository";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { Game } from "../../Domain/models/Game";
import { MatchPlayer } from "../../Domain/models/MatchPlayer";
import { TeamMemberRole } from "../../Domain/enums/TeamMemberRole";

export class MatchService implements IMatchService {
  constructor(
    private readonly gameRepo: IGameRepository,
    private readonly matchPlayerRepo: IMatchPlayerRepository,
    private readonly teamMemberRepo: ITeamMemberRepository,
  ) {}

  async getByTournament(tournamentId: number) {
    return this.gameRepo.findByTournamentIdWithTeams(tournamentId);
  }

  async getScheduled(limit: number) {
    return this.gameRepo.findScheduledWithTeams(limit);
  }

  async countWinsForUser(userId: number): Promise<number> {
    return this.gameRepo.countWinsForUser(userId);
  }

  async getById(gameId: number): Promise<{ game: Game; players: MatchPlayer[] }> {
    const game = await this.gameRepo.findById(gameId);
    const players = await this.matchPlayerRepo.getByGame(gameId);
    return { game, players };
  }

  async addPlayer(
    gameId: number,
    playerId: number,
    teamId: number,
    captainId: number,
  ): Promise<{ ok: boolean; error?: string }> {
    // kapiten mora biti u timu
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some(
      (m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN,
    );
    if (!isCaptain) return { ok: false, error: "Samo kapiten može dodati igrača u meč" };

    // igrač mora biti član tima
    const isTeamMember = members.some((m) => m.playerId === playerId);
    if (!isTeamMember) return { ok: false, error: "Igrač nije član ovog tima" };

    const alreadyIn = await this.matchPlayerRepo.exists(gameId, playerId);
    if (alreadyIn) return { ok: false, error: "Igrač je već dodat u ovaj meč" };

    const ok = await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, playerId, teamId, null));
    return ok ? { ok: true } : { ok: false, error: "Greška pri dodavanju igrača" };
  }

  async updatePerformance(
    gameId: number,
    playerId: number,
    captainId: number,
    performance: string,
  ): Promise<boolean> {
    const entry = await this.matchPlayerRepo.exists(gameId, playerId);
    if (!entry) return false;
    return this.matchPlayerRepo.updatePerformance(gameId, playerId, performance);
  }

  async removePlayer(gameId: number, playerId: number, captainId: number): Promise<boolean> {
    const exists = await this.matchPlayerRepo.exists(gameId, playerId);
    if (!exists) return false;
    return this.matchPlayerRepo.removePlayer(gameId, playerId);
  }
}