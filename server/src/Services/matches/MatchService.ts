import { IMatchService } from "../../Domain/services/matches/IMatchService";
import { IGameRepository } from "../../Domain/repositories/games/IGameRepository";
import { IMatchPlayerRepository } from "../../Domain/repositories/match_players/IMatchPlayerRepository";
import { ITeamMemberRepository } from "../../Domain/repositories/team_members/ITeamMemberRepository";
import { Game } from "../../Domain/models/Game";
import { GameStatus } from "../../Domain/enums/GameStatus";
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
    let players = await this.matchPlayerRepo.getByGame(gameId);

    // Auto-backfill: if match is completed but has no players recorded, generate them now
    if (
      game.status === GameStatus.COMPLETED &&
      players.length === 0 &&
      game.team1Id !== null &&
      game.team2Id !== null &&
      game.winnerTeamId !== null
    ) {
      players = await this.generateAndSaveStats(game);
    }

    return { game, players };
  }

  private async generateAndSaveStats(game: Game): Promise<MatchPlayer[]> {
    const { gameId, team1Id, team2Id, score, winnerTeamId } = game;
    if (team1Id === null || team2Id === null || winnerTeamId === null) return [];

    const [team1Members, team2Members] = await Promise.all([
      this.teamMemberRepo.getMembersByTeam(team1Id),
      this.teamMemberRepo.getMembersByTeam(team2Id),
    ]);

    // Add all players to MATCH_PLAYERS
    for (const m of team1Members) {
      const exists = await this.matchPlayerRepo.exists(gameId, m.playerId);
      if (!exists) await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, m.playerId, team1Id, null));
    }
    for (const m of team2Members) {
      const exists = await this.matchPlayerRepo.exists(gameId, m.playerId);
      if (!exists) await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, m.playerId, team2Id, null));
    }

    // Generate stats
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

    return this.matchPlayerRepo.getByGame(gameId);
  }

  async addPlayer(
    gameId: number,
    playerId: number,
    teamId: number,
    captainId: number,
  ): Promise<{ ok: boolean; error?: string }> {
    const members = await this.teamMemberRepo.getMembersByTeam(teamId);
    const isCaptain = members.some(
      (m) => m.playerId === captainId && m.role === TeamMemberRole.CAPTAIN,
    );
    if (!isCaptain) return { ok: false, error: "Only the captain can add a player to a match" };

    const isTeamMember = members.some((m) => m.playerId === playerId);
    if (!isTeamMember) return { ok: false, error: "Player is not a member of this team" };

    const alreadyIn = await this.matchPlayerRepo.exists(gameId, playerId);
    if (alreadyIn) return { ok: false, error: "Player is already added to this match" };

    const ok = await this.matchPlayerRepo.addPlayer(new MatchPlayer(gameId, playerId, teamId, null));
    return ok ? { ok: true } : { ok: false, error: "Failed to add player" };
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

  async updateResult(gameId: number, score: string, winnerTeamId: number | null, status: GameStatus): Promise<boolean> {
    return this.gameRepo.updateResult(gameId, score, winnerTeamId, status);
  }

  async updateScheduledTime(gameId: number, scheduledTime: Date | null): Promise<boolean> {
    return this.gameRepo.updateScheduledTime(gameId, scheduledTime);
  }
}
