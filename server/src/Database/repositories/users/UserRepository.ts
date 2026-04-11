import { RowDataPacket, ResultSetHeader } from "mysql2";
import { IUserRepository } from "../../../Domain/repositories/users/IUserRepository";
import { User } from "../../../Domain/models/User";
import { UserRole } from "../../../Domain/enums/UserRole";
import { DbManager } from "../../connection/DbConnectionPool";
import { ILoggerService } from "../../../Domain/services/logger/ILoggerService";

export class UserRepository implements IUserRepository {
  public constructor(
    private readonly db: DbManager,
    private readonly logger: ILoggerService,
  ) {}

  private map(r: RowDataPacket): User {
    return new User(
      r.id,
      r.gamer_tag,
      r.email,
      r.role as UserRole,
      r.isActive,
      r.passwordHash,
      r.createdAt ? new Date(r.createdAt) : new Date(),
      r.updatedAt ? new Date(r.updatedAt) : new Date(),
      r.full_name ?? "",
      r.profile_picture ?? null
    );
  }

  async create(user: User): Promise<User> {
    const res = await this.db.getWriteConnection();
    if (!res) return new User();

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        INSERT INTO users
          (gamer_tag, email, passwordHash, role, isActive, createdAt, updatedAt, full_name, profile_picture)
        VALUES
          (?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
        `,
        [
          user.gamerTag,
          user.email,
          user.passwordHash,
          user.role,
          user.isActive,
          user.fullName,
          user.profilePicture,
        ]
      );

      if (result.insertId === 0) return new User();

      const created = await this.findById(result.insertId);
      return created;
    } catch (err) {
      this.logger.error("UserRepository", "create failed", err);
      return new User();
    } finally {
      res.conn.release();
    }
  }

  async findById(id: number): Promise<User> {
    const res = await this.db.getReadConnection();
    if (!res) return new User();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM users WHERE id = ?`,
        [id]
      );

      return rows.length > 0 ? this.map(rows[0]) : new User();
    } catch (err) {
      this.logger.error("UserRepository", "findById failed", err);
      return new User();
    } finally {
      res.conn.release();
    }
  }

  async findByGamerTag(gamerTag: string): Promise<User> {
    const res = await this.db.getReadConnection();
    if (!res) return new User();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM users WHERE gamer_tag = ?`,
        [gamerTag]
      );

      return rows.length > 0 ? this.map(rows[0]) : new User();
    } catch (err) {
      this.logger.error("UserRepository", "findByGamerTag failed", err);
      return new User();
    } finally {
      res.conn.release();
    }
  }

  async findByEmail(email: string): Promise<User> {
    const res = await this.db.getReadConnection();
    if (!res) return new User();

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM users WHERE email = ?`,
        [email]
      );

      return rows.length > 0 ? this.map(rows[0]) : new User();
    } catch (err) {
      this.logger.error("UserRepository", "findByEmail failed", err);
      return new User();
    } finally {
      res.conn.release();
    }
  }

  async findAll(): Promise<User[]> {
    const res = await this.db.getReadConnection();
    if (!res) return [];

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT * FROM users ORDER BY id ASC`
      );

      return rows.map((r) => this.map(r));
    } catch (err) {
      this.logger.error("UserRepository", "findAll failed", err);
      return [];
    } finally {
      res.conn.release();
    }
  }

  async update(user: User): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE users
        SET gamer_tag = ?,
            email = ?,
            role = ?,
            isActive = ?,
            full_name = ?,
            profile_picture = ?,
            updatedAt = NOW()
        WHERE id = ?
        `,
        [
          user.gamerTag,
          user.email,
          user.role,
          user.isActive,
          user.fullName,
          user.profilePicture,
          user.id,
        ]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("UserRepository", "update failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `
        UPDATE users
        SET passwordHash = ?, updatedAt = NOW()
        WHERE id = ?
        `,
        [passwordHash, id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("UserRepository", "updatePassword failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async deactivate(id: number): Promise<boolean> {
    const res = await this.db.getWriteConnection();
    if (!res) return false;

    try {
      const [result] = await res.conn.execute<ResultSetHeader>(
        `UPDATE users SET isActive = 0, updatedAt = NOW() WHERE id = ?`,
        [id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      this.logger.error("UserRepository", "deactivate failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }

  async exists(id: number): Promise<boolean> {
    const res = await this.db.getReadConnection();
    if (!res) return false;

    try {
      const [rows] = await res.conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM users WHERE id = ?`,
        [id]
      );

      return (rows[0]?.cnt ?? 0) > 0;
    } catch (err) {
      this.logger.error("UserRepository", "exists failed", err);
      return false;
    } finally {
      res.conn.release();
    }
  }
}