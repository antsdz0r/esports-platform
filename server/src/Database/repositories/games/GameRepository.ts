import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IGameRepository } from "../../../Domain/repositories/games/IGameRepository";
import { Game } from "../../../Domain/models/Game";
import { GameStatus } from "../../../Domain/enums/GameStatus";
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
      r.winner_team_id
    );
  }

  async create(game: Game): Promise<Game> {
    const res = await this.db.getWriteConnection();
    if (!res) return new Game();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO GAMES
          (tournament_id, team1_id, team2_id, round, score, status, winner_team_id)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          game.tournamentId,
          game.team1Id,
          game.team2Id,
          game.round,
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
        game.winnerTeamId
      );
    } catch (err) {
      this.logger.error("GameRepository", "create failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "findById failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "findAll failed", err);
      return [];
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
    } catch (err) {
      this.logger.error("GameRepository", "findByTournamentId failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "findByTeamId failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "update failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "updateStatus failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updateResult(
    gameId: number,
    score: string,
    winnerTeamId: number | null
  ): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE GAMES
        SET score = ?,
            winner_team_id = ?,
            status = ?
        WHERE game_id = ?
        `,
        [score, winnerTeamId, GameStatus.COMPLETED, gameId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("GameRepository", "updateResult failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "delete failed", err);
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
    } catch (err) {
      this.logger.error("GameRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }
}