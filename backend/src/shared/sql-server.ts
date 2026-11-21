import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import sql, { type ConnectionPool, type ISqlType } from 'mssql';
import { envPort, requiredEnv } from './config';
import type { Product } from './contracts';

type ParameterType = ISqlType | (() => ISqlType);
export type SqlParameter = [name: string, type: ParameterType, value: unknown];

const statusByError: Readonly<Record<number, number>> = {
  51001: 404,
  51002: 409,
  51003: 400,
  51004: 409,
  51005: 409,
  1205: 503,
};

@Injectable()
export class SqlServer implements OnApplicationShutdown {
  private readonly logger = new Logger(SqlServer.name);
  private connection?: Promise<ConnectionPool>;

  async health(): Promise<{ status: 'ok' }> {
    try {
      const pool = await this.pool();
      await pool.request().query('SELECT 1 AS available');
      return { status: 'ok' };
    } catch {
      throw new RpcException({ statusCode: 503, message: 'SQL Server no está disponible.' });
    }
  }

  async procedure<T>(name: string, parameters: SqlParameter[] = []): Promise<T[]> {
    try {
      const pool = await this.pool();
      const request = pool.request();
      for (const [key, type, value] of parameters) request.input(key, type, value);
      const result = await request.execute<T>(name);
      return result.recordset ?? [];
    } catch (cause) {
      const error = cause as { number?: number; code?: string; message?: string };
      const statusCode = error.number === undefined ? undefined : statusByError[error.number];
      if (statusCode && statusCode < 500) {
        throw new RpcException({ statusCode, message: error.message });
      }
      this.logger.error(`Fallo en ${name} [${error.code ?? 'SQL'} / ${error.number ?? 'sin número'}]`);
      throw new RpcException({ statusCode: 503, message: 'No se pudo completar la operación en SQL Server.' });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    const pool = await this.connection?.catch(() => undefined);
    await pool?.close();
  }

  private pool(): Promise<ConnectionPool> {
    if (!this.connection) {
      const pool = new sql.ConnectionPool({
        server: requiredEnv('DB_HOST'),
        port: envPort('DB_PORT', 1433),
        database: requiredEnv('DB_NAME'),
        user: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
        options: {
          encrypt: process.env.DB_ENCRYPT !== 'false',
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
          useUTC: true,
        },
        connectionTimeout: 4_000,
        requestTimeout: 12_000,
        pool: { min: 0, max: 10, idleTimeoutMillis: 30_000 },
      });
      pool.on('error', () => this.logger.error('SQL Server notificó un error en la conexión.'));
      this.connection = pool.connect().catch((error: unknown) => {
        this.connection = undefined;
        throw error;
      });
    }
    return this.connection;
  }
}

export function normalizeProduct(row: Product): Product {
  return { ...row, stock: Number(row.stock) };
}
