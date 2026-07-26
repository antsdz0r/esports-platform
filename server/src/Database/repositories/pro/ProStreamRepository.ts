import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IProStreamRepository } from "../../../Domain/repositories/pro/IProStreamRepository";
import { ProStream } from "../../../Domain/models/ProStream";
import { StreamPlatform } from "../../../Domain/enums/StreamPlatform";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ProStreamRepository implements IProStreamRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ProStream {
    return new ProStream(
      r.id,
      r.pro_match_id,
      r.platform as StreamPlatform,
      r.channel,
      r.language,
      r.is_official === 1 || r.is_official === true,
      r.source,
    );
  }

  async replaceForMatch(proMatchId: number, source: string, streams: ProStream[]): Promise<void> {
    const res = await this.db.getWriteConnection();
    if (!res) return;
    try {
      await res.conn.execute(
        "DELETE FROM PRO_STREAMS WHERE pro_match_id = ? AND source = ?",
        [proMatchId, source]
      );
      for (const s of streams) {
        await res.conn.execute(
          "INSERT INTO PRO_STREAMS (pro_match_id, platform, channel, language, is_official, source) VALUES (?, ?, ?, ?, ?, ?)",
          [proMatchId, s.platform, s.channel, s.language, s.isOfficial ? 1 : 0, source]
        );
      }
    } catch {
      this.logger.error("ProStreamRepository", "replaceForMatch failed");
    } finally {
      res.conn.release();
    }
  }

  async findByMatchIds(matchIds: number[]): Promise<ProStream[]> {
    if (matchIds.length === 0) return [];
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const placeholders = matchIds.map(() => "?").join(", ");
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT * FROM PRO_STREAMS WHERE pro_match_id IN (${placeholders})
         ORDER BY is_official DESC, id ASC`,
        matchIds
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProStreamRepository", "findByMatchIds failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async findForMatch(proMatchId: number): Promise<ProStream[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    try {
      const [rows] = await res.conn.query<RowDataPacket[]>(
        `SELECT * FROM PRO_STREAMS WHERE pro_match_id = ?
         ORDER BY is_official DESC, id ASC`,
        [proMatchId]
      );
      return rows.map((r) => this.map(r));
    } catch {
      this.logger.error("ProStreamRepository", "findForMatch failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async create(stream: ProStream): Promise<number> {
    const res = await this.db.getWriteConnection();
    if (!res) return 0;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "INSERT INTO PRO_STREAMS (pro_match_id, platform, channel, language, is_official, source) VALUES (?, ?, ?, ?, ?, ?)",
        [stream.proMatchId, stream.platform, stream.channel, stream.language, stream.isOfficial ? 1 : 0, stream.source]
      );
      return result.insertId;
    } catch {
      this.logger.error("ProStreamRepository", "create failed");
      return 0;
    } finally {
      res.conn.release();
    }
  }

  async deleteLocal(streamId: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "DELETE FROM PRO_STREAMS WHERE id = ? AND source = 'local'",
        [streamId]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("ProStreamRepository", "deleteLocal failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
