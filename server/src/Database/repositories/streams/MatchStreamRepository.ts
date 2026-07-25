import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IMatchStreamRepository } from "../../../Domain/repositories/streams/IMatchStreamRepository";
import { MatchStream } from "../../../Domain/models/MatchStream";
import { StreamPlatform } from "../../../Domain/enums/StreamPlatform";
import { StreamType } from "../../../Domain/enums/StreamType";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class MatchStreamRepository implements IMatchStreamRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): MatchStream {
    return new MatchStream(
      r.stream_id,
      r.game_id,
      r.platform as StreamPlatform,
      r.channel,
      r.type as StreamType,
      r.language,
      r.title ?? null,
      r.is_active === 1 || r.is_active === true,
    );
  }

  async create(stream: MatchStream): Promise<MatchStream> {
    const res = await this.db.getWriteConnection();
    if (!res) return new MatchStream();
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "INSERT INTO MATCH_STREAMS (game_id, platform, channel, type, language, title, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [stream.gameId, stream.platform, stream.channel, stream.type, stream.language, stream.title ?? null, stream.isActive ? 1 : 0]
      );
      if (result.insertId === 0) return new MatchStream();
      return new MatchStream(
        result.insertId, stream.gameId, stream.platform, stream.channel,
        stream.type, stream.language, stream.title ?? null, stream.isActive
      );
    } catch {
      this.logger.error("MatchStreamRepository", "create failed");
      return new MatchStream();
    } finally {
      res.conn.release();
    }
  }

  async findById(streamId: number): Promise<MatchStream> {
    const res = await this.db.getReadConnection();
    if (!res) return new MatchStream();
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM MATCH_STREAMS WHERE stream_id = ?", [streamId]
      );
      return rows.length > 0 ? this.map(rows[0]) : new MatchStream();
    } catch {
      this.logger.error("MatchStreamRepository", "findById failed");
      return new MatchStream();
    } finally {
      res.conn.release();
    }
  }

  async findByGameId(gameId: number): Promise<MatchStream[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM MATCH_STREAMS WHERE game_id = ? ORDER BY (type = 'official') DESC, stream_id ASC",
        [gameId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("MatchStreamRepository", "findByGameId failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findActiveByGameId(gameId: number): Promise<MatchStream[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        "SELECT * FROM MATCH_STREAMS WHERE game_id = ? AND is_active = 1 ORDER BY (type = 'official') DESC, stream_id ASC",
        [gameId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("MatchStreamRepository", "findActiveByGameId failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async update(streamId: number, stream: MatchStream): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "UPDATE MATCH_STREAMS SET platform=?, channel=?, type=?, language=?, title=?, is_active=? WHERE stream_id=?",
        [stream.platform, stream.channel, stream.type, stream.language, stream.title ?? null, stream.isActive ? 1 : 0, streamId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("MatchStreamRepository", "update failed");
      return false;
    } finally {
      res.conn.release();
    }
  }

  async delete(streamId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "DELETE FROM MATCH_STREAMS WHERE stream_id = ?", [streamId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("MatchStreamRepository", "delete failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
