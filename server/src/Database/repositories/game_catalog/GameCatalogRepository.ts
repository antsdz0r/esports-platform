import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IGameCatalogRepository } from "../../../Domain/repositories/game_catalog/IGameCatalogRepository";
import { GameCatalog } from "../../../Domain/models/GameCatalog";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class GameCatalogRepository implements IGameCatalogRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): GameCatalog {
    return new GameCatalog(
      r.game_id,
      r.name,
      r.tag,
      r.genre,
      r.max_players
    );
  }

  async create(game: GameCatalog): Promise<GameCatalog> {
    const res = await this.db.getWriteConnection();
    if (!res) return new GameCatalog();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO GAME_CATALOG
          (name, tag, genre, max_players)
        VALUES
          (?, ?, ?, ?)
        `,
        [
          game.name,
          game.tag,
          game.genre,
          game.maxPlayers,
        ]
      );

      if (result.insertId === 0) return new GameCatalog();

      return new GameCatalog(
        result.insertId,
        game.name,
        game.tag,
        game.genre,
        game.maxPlayers
      );
    } catch (err) {
      this.logger.error("GameCatalogRepository", "create failed", err);
      return new GameCatalog();
    } finally {
      res.conn.release();
    }
  }

  async findById(gameId: number): Promise<GameCatalog> {
    const res = await this.db.getReadConnection();
    if (!res) return new GameCatalog();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAME_CATALOG WHERE game_id = ?`,
        [gameId]
      );

      return rows.length > 0 ? this.map(rows[0]) : new GameCatalog();
    } catch (err) {
      this.logger.error("GameCatalogRepository", "findById failed", err);
      return new GameCatalog();
    } finally {
      res.conn.release();
    }
  }

  async findByName(name: string): Promise<GameCatalog> {
    const res = await this.db.getReadConnection();
    if (!res) return new GameCatalog();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAME_CATALOG WHERE name = ?`,
        [name]
      );

      return rows.length > 0 ? this.map(rows[0]) : new GameCatalog();
    } catch (err) {
      this.logger.error("GameCatalogRepository", "findByName failed", err);
      return new GameCatalog();
    } finally {
      res.conn.release();
    }
  }

  async findByTag(tag: string): Promise<GameCatalog> {
    const res = await this.db.getReadConnection();
    if (!res) return new GameCatalog();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAME_CATALOG WHERE tag = ?`,
        [tag]
      );

      return rows.length > 0 ? this.map(rows[0]) : new GameCatalog();
    } catch (err) {
      this.logger.error("GameCatalogRepository", "findByTag failed", err);
      return new GameCatalog();
    } finally {
      res.conn.release();
    }
  }

  async findAll(): Promise<GameCatalog[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM GAME_CATALOG ORDER BY game_id ASC`
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("GameCatalogRepository", "findAll failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  async update(game: GameCatalog): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE GAME_CATALOG
        SET name = ?,
            tag = ?,
            genre = ?,
            max_players = ?
        WHERE game_id = ?
        `,
        [
          game.name,
          game.tag,
          game.genre,
          game.maxPlayers,
          game.gameId,
        ]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("GameCatalogRepository", "update failed", err);
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
        `DELETE FROM GAME_CATALOG WHERE game_id = ?`,
        [gameId]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("GameCatalogRepository", "delete failed", err);
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
        `SELECT COUNT(*) as cnt FROM GAME_CATALOG WHERE game_id = ?`,
        [gameId]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch (err) {
      this.logger.error("GameCatalogRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }
}