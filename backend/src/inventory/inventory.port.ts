import type {
  Document,
  DocumentHeader,
  Movement,
  Product,
  PurchaseItem,
  Registration,
  SaleItem,
} from '../shared/contracts';

export type DocumentKind = 'purchase' | 'sale';

export abstract class InventoryPort {
  abstract health(): Promise<{ status: 'ok' }>;
  abstract list(kind: DocumentKind): Promise<DocumentHeader[]>;
  abstract get(kind: DocumentKind, id: number): Promise<Document>;
  abstract register(kind: 'purchase', data: Registration<PurchaseItem>): Promise<DocumentHeader>;
  abstract register(kind: 'sale', data: Registration<SaleItem>): Promise<DocumentHeader>;
  abstract listKardex(search?: string): Promise<Product[]>;
  abstract listMovements(id: number): Promise<Movement[]>;
}
