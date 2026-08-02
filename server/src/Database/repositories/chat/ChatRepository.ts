import { ResultSetHeader, RowDataPacket } from "mysql2";
import { IChatRepository } from "../../../Domain/repositories/chat/IChatRepository";
import { ChatMessage } from "../../../Domain/models/ChatMessage";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class ChatRepository implements IChatRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): ChatMessage {
    return new ChatMessage(
      r.id, r.match_external_id, r.user_id ?? null, r.gamer_tag, r.message,
      r.created_at ? new Date(r.created_at) : new Date(),
    );
  }

  async insert(matchExternalId: string, userId: number, gamerTag: string, message: string): Promise<ChatMessage | null> {
    const res = await this.db.getWriteConnection();
    if (!res) return null;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "INSERT INTO PRO_CHAT_MESSAGES (match_external_id, user_id, gamer_tag, message) VALUES (?, ?, ?, ?)",
        [matchExternalId, userId, gamerTag, message]
      );
      return new ChatMessage(result.insertId, matchExternalId, userId, gamerTag, message, new Date());
    } catch {
      this.logger.error("ChatRepository", "insert failed");
      return null;
    } finally {
      res.conn.release();
    }
  }

  async lastForMatch(matchExternalId: string, limit: number): Promise<ChatMessage[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];
    const lim = Math.min(200, Math.max(1, Math.floor(limit) || 50)); // sanitizovan int, inline u LIMIT
    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM PRO_CHAT_MESSAGES WHERE match_external_id = ? ORDER BY id DESC LIMIT ${lim}`,
        [matchExternalId]
      );
      return rows.map((r) => this.map(r)).reverse(); // hronoloski rastuce za prikaz
    } catch {
      this.logger.error("ChatRepository", "lastForMatch failed");
      return [];
    } finally {
      res.conn.release();
    }
  }

  async deleteById(id: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;
    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        "DELETE FROM PRO_CHAT_MESSAGES WHERE id = ?",
        [id]
      );
      return result.affectedRows > 0;
    } catch {
      this.logger.error("ChatRepository", "deleteById failed");
      return false;
    } finally {
      res.conn.release();
    }
  }
}
