import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IGameRepository } from "../../../Domain/repositories/games/IGameRepository";
import { Game } from "../../../Domain/models/Game";
import { MatchWithTeams } from "../../../Domain/models/MatchWithTeams";
import { GameStatus } from "../../../Domain/enums/GameStatus";
import { BracketType } from "../../../Domain/enums/BracketType";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class GameRepository implements IGameRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): Game {
    return new Game(
      r.game_id,
      r.tournament_id,
      r.team1_id,
      r.team2_id,
      r.round,
      r.score,
      r.status as GameStatus,
      r.winner_team_id,
      r.scheduled_time ? new Date(r.scheduled_time) : null,
      (r.bracket ?? BracketType.UPPER) as BracketType,
      r.winner_to_match ?? null,
      r.winner_to_slot ?? null,
      r.loser_to_match ?? null,
      r.loser_to_slot ?? null,
    );
  }

  async create(game: Game): Promise<Game> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Game();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO GAMES
          (tournament_id, team1_id, team2_id, round, bracket, score, status, winner_team_id)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          game.tournamentId,
          game.team1Id,
          game.team2Id,
          game.round,
          game.bracket,
          game.score,
          game.status,
          game.winnerTeamId,
        ]
      );

      if (result.insertId === 0) return new Game();

      return new Game(
        result.insertId,
        game.tournamentId,
        game.team1Id,
        game.team2Id,
        game.round,
        game.score,
        game.status,
        game.winnerTeamId,
        game.scheduledTime,
        game.bracket,
      );
    } catch {
      this.logger.error("GameRepository", "create failed");
      return new Game();
    } finally {
      res.conn.release();
    }
  }

  async findById(gameId: number): Promise<Game> {
    const res = await this.db.getReadConnection();
    if (!res) return new Game();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAMES WHERE game_id = ?`,
        [gameId]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Game();
    } catch {
      this.logger.error("GameRepository", "findById failed");
      return new Game();
    } finally {
      res.conn.release();
    }
  }

  // Cita iz mastera (write connection) da bi se izbeglo zastarelo stanje sa replika
  // u read-modify-write tokovima — npr. kada se na osnovu winner/loser linkova
  // gradi napredovanje kroz bracket.
  async findByIdMaster(gameId: number): Promise<Game> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Game();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAMES WHERE game_id = ?`,
        [gameId]
      );

      return rows.length > 0 ? this.map(rows[0]) : new Game();
    } catch {
      this.logger.error("GameRepository", "findByIdMaster failed");
      return new Game();
    } finally {
      res.conn.release();
    }
  }

  async findAll(): Promise<Game[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAMES ORDER BY tournament_id ASC, round ASC, game_id ASC`
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("GameRepository", "findAll failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  private mapWithTeams(r: RowDataPacket): MatchWithTeams {
    return new MatchWithTeams(
      r.game_id,
      r.tournament_id,
      r.team1_id,
      r.team2_id,
      r.team1_name ?? null,
      r.team2_name ?? null,
      r.round,
      r.score,
      r.status,
      r.winner_team_id,
      r.scheduled_time ? new Date(r.scheduled_time) : null,
      (r.bracket ?? BracketType.UPPER) as BracketType,
    );
  }

  async findByTournamentIdWithTeams(tournamentId: number): Promise<MatchWithTeams[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT g.*, t1.team_name AS team1_name, t2.team_name AS team2_name
        FROM GAMES g
        LEFT JOIN TEAMS t1 ON g.team1_id = t1.team_id
        LEFT JOIN TEAMS t2 ON g.team2_id = t2.team_id
        WHERE g.tournament_id = ?
        ORDER BY g.round ASC, g.game_id ASC
        `,
        [tournamentId],
      );

      return rows.map((r) => this.mapWithTeams(r));
    } catch {
      this.logger.error("GameRepository", "findByTournamentIdWithTeams failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findScheduledWithTeams(limit: number): Promise<MatchWithTeams[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT g.*, t1.team_name AS team1_name, t2.team_name AS team2_name
        FROM GAMES g
        LEFT JOIN TEAMS t1 ON g.team1_id = t1.team_id
        LEFT JOIN TEAMS t2 ON g.team2_id = t2.team_id
        WHERE g.status = 'scheduled' AND g.team1_id IS NOT NULL AND g.team2_id IS NOT NULL
        ORDER BY g.tournament_id ASC, g.round ASC, g.game_id ASC
        LIMIT ?
        `,
        [limit],
      );

      return rows.map((r) => this.mapWithTeams(r));
    } catch {
      this.logger.error("GameRepository", "findScheduledWithTeams failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async countWinsForUser(userId: number): Promise<number> {
    const res = await this.db.getReadConnection();
    if (!res) return 0;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT COUNT(*) AS cnt
        FROM GAMES g
        INNER JOIN TEAM_MEMBERS tm ON g.winner_team_id = tm.team_id
        WHERE tm.player_id = ? AND g.status = 'completed' AND g.winner_team_id IS NOT NULL
        `,
        [userId],
      );

      return Number(rows[0]?.cnt ?? 0);
    } catch {
      this.logger.error("GameRepository", "countWinsForUser failed");
      return 0;
    } finally {
      res.conn.release();
    }
  }

  async findByTournamentId(tournamentId: number): Promise<Game[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT * FROM GAMES
        WHERE tournament_id = ?
        ORDER BY round ASC, game_id ASC
        `,
        [tournamentId]
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("GameRepository", "findByTournamentId failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findByTeamId(teamId: number): Promise<Game[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `
        SELECT * FROM GAMES
        WHERE team1_id = ? OR team2_id = ?
        ORDER BY tournament_id ASC, round ASC, game_id ASC
        `,
        [teamId, teamId]
      );

      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("GameRepository", "findByTeamId failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async update(game: Game): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE GAMES
        SET tournament_id = ?,
            team1_id = ?,
            team2_id = ?,
            round = ?,
            score = ?,
            status = ?,
            winner_team_id = ?
        WHERE game_id = ?
        `,
        [
          game.tournamentId,
          game.team1Id,
          game.team2Id,
          game.round,
          game.score,
          game.status,
          game.winnerTeamId,
          game.gameId,
        ]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "update failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updateStatus(gameId: number, status: GameStatus): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE GAMES SET status = ? WHERE game_id = ?`,
        [status, gameId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "updateStatus failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updateResult(
    gameId: number,
    score: string,
    winnerTeamId: number | null,
    status: GameStatus,
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE GAMES SET score = ?, winner_team_id = ?, status = ? WHERE game_id = ?`,
        [score, winnerTeamId, status, gameId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "updateResult failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updateScheduledTime(gameId: number, scheduledTime: Date | null): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE GAMES SET scheduled_time = ? WHERE game_id = ?`,
        [scheduledTime, gameId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "updateScheduledTime failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async setMatchLinks(
    gameId: number,
    winnerToMatch: number | null,
    winnerToSlot: number | null,
    loserToMatch: number | null,
    loserToSlot: number | null,
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE GAMES
         SET winner_to_match = ?, winner_to_slot = ?, loser_to_match = ?, loser_to_slot = ?
         WHERE game_id = ?`,
        [winnerToMatch, winnerToSlot, loserToMatch, loserToSlot, gameId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "setMatchLinks failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async placeTeamInMatch(gameId: number, slot: number, teamId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const column = slot === 1 ? "team1_id" : "team2_id";
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE GAMES SET ${column} = ? WHERE game_id = ?`,
        [teamId, gameId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "placeTeamInMatch failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async delete(gameId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `DELETE FROM GAMES WHERE game_id = ?`,
        [gameId]
      );

      return result.affectedRows > 0;
    } catch {
      this.logger.error("GameRepository", "delete failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async exists(gameId: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM GAMES WHERE game_id = ?`,
        [gameId]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch {
      this.logger.error("GameRepository", "exists failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async createMatch(
    tournamentId: number,
    team1Id: number | null,
    team2Id: number | null,
    round: number
    ): Promise<boolean> {
    const game = new Game(0, tournamentId, team1Id, team2Id, round, "0:0", GameStatus.SCHEDULED, null);
    const created = await this.create(game);
    return created.gameId !== 0;
}

  async deleteMatchesForTournament(tournamentId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
      if (!res) return false;

        try {
          const [result] = await res.conn.execute<ResultSetHeader>(
          `DELETE FROM GAMES WHERE tournament_id = ?`,
          [tournamentId]
      );
      return result.affectedRows >= 0;
   } catch {
     this.logger.error("GameRepository", "deleteMatchesForTournament failed");
     return false;
    } finally {
      res.conn.release();
  }
}



}
