export interface Product {
  id: number;
  name: string;
  lot: string;
  registeredAt: string;
  cost: number;
  salePrice: number;
  stock: number;
}

export type NewProduct = Pick<Product, 'name' | 'lot' | 'cost'>;
export type ProductChanges = Partial<NewProduct>;

export interface SaleItem {
  productId: number;
  quantity: number;
}

export interface PurchaseItem extends SaleItem {
  price: number;
}

export interface DocumentHeader {
  id: number;
  registeredAt: string;
  subtotal: number;
  igv: number;
  total: number;
}

export interface DocumentItem extends PurchaseItem {
  subtotal: number;
  igv: number;
  total: number;
}

export interface Document extends DocumentHeader {
  items: DocumentItem[];
}

export interface Registration<T extends SaleItem> {
  items: T[];
  requestId?: string;
}

export interface Movement {
  id: number;
  registeredAt: string;
  type: 'Entrada' | 'Salida';
  quantity: number;
}

export const catalogCommands = {
  health: 'catalog.health',
  list: 'catalog.list',
  get: 'catalog.get',
  create: 'catalog.create',
  update: 'catalog.update',
  delete: 'catalog.delete',
} as const;

export const inventoryCommands = {
  health: 'inventory.health',
  listPurchases: 'inventory.purchases.list',
  getPurchase: 'inventory.purchases.get',
  registerPurchase: 'inventory.purchases.register',
  listSales: 'inventory.sales.list',
  getSale: 'inventory.sales.get',
  registerSale: 'inventory.sales.register',
  listKardex: 'inventory.kardex.list',
  listMovements: 'inventory.kardex.movements',
} as const;
