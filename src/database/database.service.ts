import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  pool!: mysql.Pool;

  private createPool() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: +(process.env.DB_CONN_LIMIT || 10),
      queueLimit: 0,
      // Note: if your DB requires SSL, set the `ssl` option via env vars and configure accordingly.
    });
  }

  async onModuleInit() {
    this.createPool();
    try {
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();
      this.logger.log('MySQL pool created');
      console.log('MySQL pool created');
    } catch (err: any) {
      this.logger.error('Initial DB ping failed, will keep pool and retry on demand', (err && err.message) || String(err));
    }
  }

  async onModuleDestroy() {
    try {
      await this.pool.end();
      this.logger.log('MySQL pool closed');
    } catch (err: any) {
      this.logger.error('Error closing MySQL pool', (err && err.message) || String(err));
    }
  }

  getPool() {
    if (!this.pool) {
      this.createPool();
    }
    return this.pool;
  }

  /**
   * Execute a query with automatic retry on transient connection errors (ECONNRESET, PROTOCOL_CONNECTION_LOST).
   * Attempts one reconnect and retry before throwing.
   */
  async execute<T extends mysql.QueryResult = mysql.QueryResult>(sql: string, params?: any[]) {
    if (!this.pool) this.createPool();

    try {
  return (await this.pool.execute(sql, params)) as unknown as T;
    } catch (err: any) {
      const code = err?.code;
      if (code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST' || code === 'ECONNREFUSED') {
        this.logger.warn(`DB connection error (${code}), recreating pool and retrying once`);
        try {
          // try to end existing pool gracefully
          try {
            await this.pool.end();
          } catch (e) {
            // ignore
          }
          // recreate pool
          this.createPool();
          return (await this.pool.execute(sql, params)) as unknown as T;
        } catch (retryErr) {
          this.logger.error(
            'Retry after recreating pool failed',
            retryErr instanceof Error ? retryErr.message : String(retryErr)
          );
          throw retryErr;
        }
      }
      throw err;
    }
  }
}