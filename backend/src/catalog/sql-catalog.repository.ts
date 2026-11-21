import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import sql from 'mssql';
import type { NewProduct, Product, ProductChanges } from '../shared/contracts';
import { normalizeProduct, SqlServer, type SqlParameter } from '../shared/sql-server';
import type { CatalogRepository } from './catalog.repository';

@Injectable()
export class SqlCatalogRepository implements CatalogRepository {
  constructor(private readonly database: SqlServer) {}

  health(): Promise<{ status: 'ok' }> {
    return this.database.health();
  }

  async list(): Promise<Product[]> {
    const products = await this.database.procedure<Product>('dbo.usp_ProductList');
    return products.map(normalizeProduct);
  }

  get(id: number): Promise<Product> {
    return this.product('dbo.usp_ProductGet', [['Id', sql.Int, id]]);
  }

  create({ name, lot, cost }: NewProduct): Promise<Product> {
    return this.product('dbo.usp_ProductCreate', [
      ['Name', sql.NVarChar(120), name],
      ['Lot', sql.NVarChar(60), lot],
      ['Cost', sql.Decimal(12, 2), cost],
    ]);
  }

  update(id: number, { name, lot, cost }: ProductChanges): Promise<Product> {
    return this.product('dbo.usp_ProductUpdate', [
      ['Id', sql.Int, id],
      ['Name', sql.NVarChar(120), name ?? null],
      ['Lot', sql.NVarChar(60), lot ?? null],
      ['Cost', sql.Decimal(12, 2), cost ?? null],
    ]);
  }

  async delete(id: number): Promise<void> {
    await this.database.procedure('dbo.usp_ProductDelete', [['Id', sql.Int, id]]);
  }

  private async product(procedure: string, parameters: SqlParameter[]): Promise<Product> {
    const [product] = await this.database.procedure<Product>(procedure, parameters);
    if (!product) {
      throw new RpcException({ statusCode: 503, message: 'SQL Server no devolvió el producto.' });
    }
    return normalizeProduct(product);
  }
}
