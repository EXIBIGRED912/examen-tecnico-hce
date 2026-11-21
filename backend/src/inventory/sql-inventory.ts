import { Injectable } from '@nestjs/common';
import sql from 'mssql';
import type {
  Document,
  DocumentHeader,
  DocumentItem,
  Movement,
  Product,
  Registration,
  SaleItem,
} from '../shared/contracts';
import { normalizeProduct, SqlServer, type SqlParameter } from '../shared/sql-server';
import { InventoryPort, type DocumentKind } from './inventory.port';

const procedures = {
  purchase: {
    list: 'dbo.usp_PurchaseList',
    detail: 'dbo.usp_PurchaseDetail',
    register: 'dbo.usp_PurchaseRegister',
  },
  sale: {
    list: 'dbo.usp_SaleList',
    detail: 'dbo.usp_SaleDetail',
    register: 'dbo.usp_SaleRegister',
  },
} as const;

type SqlDate<T> = Omit<T, 'registeredAt'> & { registeredAt: Date };

function withIsoDate<T extends { registeredAt: Date }>(row: T): Omit<T, 'registeredAt'> & { registeredAt: string } {
  return { ...row, registeredAt: row.registeredAt.toISOString() };
}

@Injectable()
export class SqlInventory extends InventoryPort {
  constructor(private readonly server: SqlServer) {
    super();
  }

  health(): Promise<{ status: 'ok' }> {
    return this.server.health();
  }

  async list(kind: DocumentKind): Promise<DocumentHeader[]> {
    const rows = await this.server.procedure<SqlDate<DocumentHeader>>(procedures[kind].list);
    return rows.map(withIsoDate);
  }

  async get(kind: DocumentKind, id: number): Promise<Document> {
    const { list, detail } = procedures[kind];
    const parameters: SqlParameter[] = [['Id', sql.Int, id]];
    const [[header], items] = await Promise.all([
      this.server.procedure<SqlDate<DocumentHeader>>(list, parameters),
      this.server.procedure<DocumentItem>(detail, parameters),
    ]);
    return { ...withIsoDate(header), items };
  }

  async register(kind: DocumentKind, { items, requestId }: Registration<SaleItem>): Promise<DocumentHeader> {
    const [header] = await this.server.procedure<SqlDate<DocumentHeader>>(procedures[kind].register, [
      ['Lines', sql.NVarChar(sql.MAX), JSON.stringify(items)],
      ['RequestId', sql.UniqueIdentifier, requestId ?? null],
    ]);
    return withIsoDate(header);
  }

  async listKardex(search?: string): Promise<Product[]> {
    const rows = await this.server.procedure<SqlDate<Product>>('dbo.usp_KardexList');
    const term = search?.trim().toLocaleLowerCase('es-PE');
    const matches = term ? rows.filter(({ name, lot }) =>
      name.toLocaleLowerCase('es-PE').includes(term) || lot.toLocaleLowerCase('es-PE').includes(term),
    ) : rows;
    return matches.map((row) => normalizeProduct(withIsoDate(row)));
  }

  async listMovements(id: number): Promise<Movement[]> {
    const rows = await this.server.procedure<SqlDate<Movement>>('dbo.usp_KardexMovements', [
      ['ProductId', sql.Int, id],
    ]);
    return rows.map(withIsoDate);
  }
}
