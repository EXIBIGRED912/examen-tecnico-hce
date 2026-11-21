import { HttpException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  catalogCommands, inventoryCommands, type Document, type DocumentHeader, type Movement,
  type NewProduct, type Product, type ProductChanges, type PurchaseItem, type Registration, type SaleItem,
} from '../shared/contracts';

export const CATALOG_CLIENT = Symbol('catalog-client');
export const INVENTORY_CLIENT = Symbol('inventory-client');

type Health = { status: 'ok' };

function dependencyStatus(result: PromiseSettledResult<Health>): 'ok' | 'unavailable' {
  return result.status === 'fulfilled' && result.value.status === 'ok' ? 'ok' : 'unavailable';
}

@Injectable()
export class InventoryFacade {
  private readonly logger = new Logger(InventoryFacade.name);

  constructor(
    @Inject(CATALOG_CLIENT) private readonly catalog: ClientProxy,
    @Inject(INVENTORY_CLIENT) private readonly inventory: ClientProxy,
  ) {}

  async health() {
    const [catalog, inventory] = await Promise.allSettled([
      this.call<Health>(this.catalog, catalogCommands.health, {}, 3_500),
      this.call<Health>(this.inventory, inventoryCommands.health, {}, 3_500),
    ]);
    const services = { catalog: dependencyStatus(catalog), inventory: dependencyStatus(inventory) };
    if (services.catalog !== 'ok' || services.inventory !== 'ok') {
      throw new ServiceUnavailableException({ status: 'unavailable', services });
    }
    return { status: 'ok', services };
  }

  listProducts(search?: string): Promise<Product[]> {
    return this.call(this.catalog, catalogCommands.list, { search });
  }

  getProduct(id: number): Promise<Product> {
    return this.call(this.catalog, catalogCommands.get, { id });
  }

  createProduct(product: NewProduct): Promise<Product> {
    return this.call(this.catalog, catalogCommands.create, product);
  }

  updateProduct(id: number, changes: ProductChanges): Promise<Product> {
    return this.call(this.catalog, catalogCommands.update, { id, changes });
  }

  async deleteProduct(id: number): Promise<void> {
    await this.call<null>(this.catalog, catalogCommands.delete, { id });
  }

  listPurchases(): Promise<DocumentHeader[]> {
    return this.call(this.inventory, inventoryCommands.listPurchases, {});
  }

  getPurchase(id: number): Promise<Document> {
    return this.call(this.inventory, inventoryCommands.getPurchase, { id });
  }

  registerPurchase(purchase: Registration<PurchaseItem>): Promise<DocumentHeader> {
    return this.call(this.inventory, inventoryCommands.registerPurchase, purchase);
  }

  listSales(): Promise<DocumentHeader[]> {
    return this.call(this.inventory, inventoryCommands.listSales, {});
  }

  getSale(id: number): Promise<Document> {
    return this.call(this.inventory, inventoryCommands.getSale, { id });
  }

  registerSale(sale: Registration<SaleItem>): Promise<DocumentHeader> {
    return this.call(this.inventory, inventoryCommands.registerSale, sale);
  }

  listKardex(search?: string): Promise<Product[]> {
    return this.call(this.inventory, inventoryCommands.listKardex, { search });
  }

  listMovements(id: number): Promise<Movement[]> {
    return this.call(this.inventory, inventoryCommands.listMovements, { id });
  }

  private async call<T>(client: ClientProxy, command: string, payload: object, timeoutMs = 14_000): Promise<T> {
    try {
      return await firstValueFrom(client.send<T>(command, payload).pipe(timeout({ first: timeoutMs })));
    } catch (cause) {
      const error = cause as { statusCode?: number; message?: unknown } | null;
      const statusCode = error?.statusCode;
      if ((statusCode === 400 || statusCode === 404 || statusCode === 409 || statusCode === 503)
        && typeof error?.message === 'string') {
        throw new HttpException(error.message, statusCode);
      }
      this.logger.warn(`Sin respuesta válida para ${command}.`);
      throw new ServiceUnavailableException('El servicio de inventario no está disponible.');
    }
  }
}
