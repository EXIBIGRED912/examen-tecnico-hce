import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { catalogCommands, type NewProduct, type Product, type ProductChanges } from '../shared/contracts';
import { CATALOG_REPOSITORY, type CatalogRepository } from './catalog.repository';

function searchText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-PE');
}

@Controller()
export class CatalogController {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository) {}

  @MessagePattern(catalogCommands.health)
  health(): Promise<{ status: 'ok' }> {
    return this.catalog.health();
  }

  @MessagePattern(catalogCommands.list)
  async list(@Payload() { search = '' }: { search?: string } = {}): Promise<Product[]> {
    const products = await this.catalog.list();
    const term = searchText(search.trim());
    if (!term) return products;
    return products.filter(({ id, name, lot }) => searchText(`${id} ${name} ${lot}`).includes(term));
  }

  @MessagePattern(catalogCommands.get)
  get(@Payload() { id }: { id: number }): Promise<Product> {
    return this.catalog.get(id);
  }

  @MessagePattern(catalogCommands.create)
  create(@Payload() product: NewProduct): Promise<Product> {
    return this.catalog.create(product);
  }

  @MessagePattern(catalogCommands.update)
  update(@Payload() { id, changes }: { id: number; changes: ProductChanges }): Promise<Product> {
    return this.catalog.update(id, changes);
  }

  @MessagePattern(catalogCommands.delete)
  async delete(@Payload() { id }: { id: number }): Promise<null> {
    await this.catalog.delete(id);
    return null;
  }
}
