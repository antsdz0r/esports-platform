import { RowDataPacket } from "mysql2";
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
}
