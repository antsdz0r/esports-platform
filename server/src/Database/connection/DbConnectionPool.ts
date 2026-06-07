import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import dotenv from "dotenv";
import { DbNode } from "../../Domain/models/DbNode";
import { NodeStatus } from "../../Domain/enums/NodeStatus";
import { HEALTH_CHECK_TIMEOUT, HEALTH_CHECK_INTERVAL_MS, DEGRADED_THRESHOLD_MS } from "../../Domain/constants/Constants";
import { ILoggerService } from "../../Domain/services/logger/ILoggerService";

dotenv.config();

const DB_NAME = process.env.DB_NAME ?? "project_db";

// Maksimalno dozvoljeno kasnjenje replike (u sekundama) da bi se sa nje citalo.
const REPLICA_LAG_THRESHOLD_SEC = 10;

const masterPool: Pool = mysql.createPool({
  host:     process.env.DB_MASTER_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_MASTER_PORT ?? "3306", 10),
  user:     process.env.DB_MASTER_USER     ?? "root",
  password: process.env.DB_MASTER_PASSWORD ?? "",
  database: process.env.DB_MASTER_NAME     ?? DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: HEALTH_CHECK_TIMEOUT,
});

const slave1Pool: Pool = mysql.createPool({
  host:     process.env.DB_SLAVE1_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_SLAVE1_PORT ?? "3307", 10),
  user:     process.env.DB_SLAVE1_USER     ?? "root",
  password: process.env.DB_SLAVE1_PASSWORD ?? "",
  database: process.env.DB_SLAVE1_NAME     ?? DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: HEALTH_CHECK_TIMEOUT,
});

const slave2Pool: Pool = mysql.createPool({
  host:     process.env.DB_SLAVE2_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_SLAVE2_PORT ?? "3308", 10),
  user:     process.env.DB_SLAVE2_USER     ?? "root",
  password: process.env.DB_SLAVE2_PASSWORD ?? "",
  database: process.env.DB_SLAVE2_NAME     ?? DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: HEALTH_CHECK_TIMEOUT,
});

interface NodeInfo { name: string; pool: Pool; node: DbNode; isSlave: boolean; }

export class DbManager {
  private master: NodeInfo;
  private slaves: NodeInfo[];
  private slaveRrIndex: number = 0;
  private healthTimer: NodeJS.Timeout | null = null;
  private failoverInProgress: boolean = false;

  public constructor(private readonly logger: ILoggerService) {
    this.master = {
      name: "master", pool: masterPool, isSlave: false,
      node: new DbNode("master", process.env.DB_MASTER_HOST ?? "localhost", parseInt(process.env.DB_MASTER_PORT ?? "3306", 10)),
    };
    this.slaves = [
      { name: "slave1", pool: slave1Pool, isSlave: true, node: new DbNode("slave1", process.env.DB_SLAVE1_HOST ?? "localhost", parseInt(process.env.DB_SLAVE1_PORT ?? "3307", 10)) },
      { name: "slave2", pool: slave2Pool, isSlave: true, node: new DbNode("slave2", process.env.DB_SLAVE2_HOST ?? "localhost", parseInt(process.env.DB_SLAVE2_PORT ?? "3308", 10)) },
    ];
  }

  private async checkNode(info: NodeInfo): Promise<void> {
    const start = Date.now();
    let conn: PoolConnection | null = null;
    try {
      conn = await info.pool.getConnection();
      await conn.query("SELECT 1");
      const ms = Date.now() - start;
      info.node.latencyMs = ms;
      info.node.status = ms > DEGRADED_THRESHOLD_MS ? NodeStatus.DEGRADED : NodeStatus.HEALTHY;

      // Za slave cvorove proveravamo i status replikacije. Ako ne radi ili previse
      // kasni, cvor se iskljucuje iz citanja (citanja padaju na master) da korisnik
      // uvek vidi sveze podatke.
      if (info.isSlave) {
        info.node.replicaOk = await this.checkReplication(conn, info.name);
      }
    } catch {
      info.node.status = NodeStatus.OFFLINE;
      info.node.failedWrites++;
      info.node.latencyMs = null;
      if (info.isSlave) info.node.replicaOk = false;
      this.logger.warn("DB", `Node ${info.name} failed health check`);
    } finally {
      if (conn) conn.release();
      info.node.lastCheck = new Date();
    }
  }

  private async checkReplication(conn: PoolConnection, name: string): Promise<boolean> {
    try {
      const [rows] = await conn.query<RowDataPacket[]>("SHOW REPLICA STATUS");
      if (!rows || rows.length === 0) {
        this.logger.warn("DB", `Slave ${name}: replikacija nije konfigurisana — iskljucen iz citanja`);
        return false;
      }
      const r = rows[0];
      const io = String(r.Replica_IO_Running ?? r.Slave_IO_Running ?? "");
      const sql = String(r.Replica_SQL_Running ?? r.Slave_SQL_Running ?? "");
      const behindRaw = r.Seconds_Behind_Source ?? r.Seconds_Behind_Master;
      const behind = behindRaw == null ? null : Number(behindRaw);

      if (io !== "Yes" || sql !== "Yes") {
        this.logger.warn("DB", `Slave ${name}: replikacija stala (IO=${io}, SQL=${sql}) — iskljucen iz citanja`);
        return false;
      }
      if (behind == null || behind > REPLICA_LAG_THRESHOLD_SEC) {
        this.logger.warn("DB", `Slave ${name}: kasni ${behind ?? "?"}s — iskljucen iz citanja`);
        return false;
      }
      return true;
    } catch {
      this.logger.warn("DB", `Slave ${name}: ne mogu da procitam status replikacije — iskljucen iz citanja`);
      return false;
    }
  }

  public async runHealthCheck(): Promise<void> {
    await Promise.all([this.master, ...this.slaves].map((n) => this.checkNode(n)));
    this.logger.info("DB", [this.master, ...this.slaves].map((n) => `${n.name}=${n.node.status}${n.isSlave ? (n.node.replicaOk ? "(repl ok)" : "(repl off)") : ""}`).join(" | "));

    if (this.master.node.status === NodeStatus.OFFLINE) {
      await this.promoteSlaveToMaster();
    }
  }

  /**
   * Automatski failover — promovise prvi dostupan slave u novog mastera
   * tako da sistem zadrzi mogucnost pisanja kada master padne.
   */
  private async promoteSlaveToMaster(): Promise<boolean> {
    if (this.failoverInProgress) return false;
    this.failoverInProgress = true;
    try {
      const candidate =
        this.slaves.find((s) => s.node.status === NodeStatus.HEALTHY) ??
        this.slaves.find((s) => s.node.status === NodeStatus.DEGRADED);

      if (!candidate) {
        this.logger.error("DB", "FAILOVER nije moguc — nema zdravog slave cvora za promociju");
        return false;
      }

      this.logger.warn("DB", `FAILOVER: promovisem ${candidate.name} u novog mastera`);

      try {
        const conn = await candidate.pool.getConnection();
        try {
          await conn.query("STOP REPLICA");
          await conn.query("SET GLOBAL super_read_only = OFF");
          await conn.query("SET GLOBAL read_only = OFF");
        } catch {
          this.logger.warn("DB", `FAILOVER: rekonfiguracija ${candidate.name} delimicno neuspela (nastavljam)`);
        } finally {
          conn.release();
        }
      } catch {
        this.logger.warn("DB", `FAILOVER: konekcija ka ${candidate.name} neuspesna tokom promocije`);
        return false;
      }

      const oldMaster = this.master;
      oldMaster.node.status = NodeStatus.OFFLINE;
      candidate.isSlave = false;
      candidate.node.replicaOk = true;
      this.master = candidate;
      this.slaves = this.slaves.filter((s) => s !== candidate);
      this.slaveRrIndex = 0;

      this.logger.warn("DB", `FAILOVER zavrsen — novi master je ${candidate.name}`);
      return true;
    } finally {
      this.failoverInProgress = false;
    }
  }

  public async init(): Promise<void> {
    await this.runHealthCheck();
    this.healthTimer = setInterval(() => void this.runHealthCheck(), HEALTH_CHECK_INTERVAL_MS);
  }

  /** All writes (INSERT/UPDATE/DELETE) → Master only (sa automatskim failover-om) */
  public async getWriteConnection(): Promise<{ conn: PoolConnection; nodeName: string } | null> {
    if (this.master.node.status === NodeStatus.OFFLINE) {
      const promoted = await this.promoteSlaveToMaster();
      if (!promoted) {
        this.logger.error("DB", "Master is OFFLINE — write not possible (failover neuspeo)");
        return null;
      }
    }
    try {
      const conn = await this.master.pool.getConnection();
      this.master.node.successfulWrites++;
      return { conn, nodeName: this.master.name };
    } catch {
      this.master.node.status = NodeStatus.OFFLINE;
      this.master.node.failedWrites++;
      this.logger.error("DB", "Failed to connect to master");
      const promoted = await this.promoteSlaveToMaster();
      if (!promoted) return null;
      try {
        const conn = await this.master.pool.getConnection();
        this.master.node.successfulWrites++;
        return { conn, nodeName: this.master.name };
      } catch {
        return null;
      }
    }
  }

  /**
   * All reads (SELECT) → Round-Robin po slave-ovima kojima replikacija radi.
   * Ako nijedan slave nije upotrebljiv (offline ili replikacija stala/kasni),
   * citanje pada na master kao poslednju liniju odbrane.
   */
  public async getReadConnection(): Promise<{ conn: PoolConnection; nodeName: string } | null> {
    const n = this.slaves.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.slaveRrIndex + i) % n;
      const info = this.slaves[idx];
      if (info.node.status === NodeStatus.OFFLINE || !info.node.replicaOk) continue;
      try {
        const conn = await info.pool.getConnection();
        this.slaveRrIndex = (idx + 1) % n;
        info.node.successfulWrites++;
        return { conn, nodeName: info.name };
      } catch (err) {
        info.node.status = NodeStatus.OFFLINE;
        info.node.failedWrites++;
        this.logger.warn("DB", `Slave ${info.name} unreachable, trying next`);
      }
    }
    this.logger.warn("DB", "Nema upotrebljivog slave-a — citanje ide na master (fallback)");
    if (this.master.node.status === NodeStatus.OFFLINE) {
      this.logger.error("DB", "Master also offline — read not possible");
      return null;
    }
    try {
      const conn = await this.master.pool.getConnection();
      this.master.node.successfulWrites++;
      return { conn, nodeName: this.master.name };
    } catch {
      this.master.node.status = NodeStatus.OFFLINE;
      this.logger.error("DB", "Failed to connect to master for fallback read");
      return null;
    }
  }

  public getNodes(): DbNode[] { return [this.master.node, ...this.slaves.map((s) => s.node)]; }
  public getSlaveRrIndex(): number { return this.slaveRrIndex; }
  public stop(): void { if (this.healthTimer) clearInterval(this.healthTimer); }
}
