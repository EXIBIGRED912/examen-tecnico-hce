import type { NewProduct, Product, ProductChanges } from '../shared/contracts';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogRepository {
  health(): Promise<{ status: 'ok' }>;
  list(): Promise<Product[]>;
  get(id: number): Promise<Product>;
  create(product: NewProduct): Promise<Product>;
  update(id: number, changes: ProductChanges): Promise<Product>;
  delete(id: number): Promise<void>;
}
