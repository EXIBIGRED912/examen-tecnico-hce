import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { inventoryCommands, type PurchaseItem, type Registration, type SaleItem } from '../shared/contracts';
import { InventoryPort } from './inventory.port';

@Controller()
export class InventoryController {
  constructor(private readonly inventory: InventoryPort) {}

  @MessagePattern(inventoryCommands.health)
  health() {
    return this.inventory.health();
  }

  @MessagePattern(inventoryCommands.listPurchases)
  listPurchases() {
    return this.inventory.list('purchase');
  }

  @MessagePattern(inventoryCommands.getPurchase)
  getPurchase(@Payload() { id }: { id: number }) {
    return this.inventory.get('purchase', id);
  }

  @MessagePattern(inventoryCommands.registerPurchase)
  registerPurchase(@Payload() data: Registration<PurchaseItem>) {
    return this.inventory.register('purchase', data);
  }

  @MessagePattern(inventoryCommands.listSales)
  listSales() {
    return this.inventory.list('sale');
  }

  @MessagePattern(inventoryCommands.getSale)
  getSale(@Payload() { id }: { id: number }) {
    return this.inventory.get('sale', id);
  }

  @MessagePattern(inventoryCommands.registerSale)
  registerSale(@Payload() data: Registration<SaleItem>) {
    return this.inventory.register('sale', data);
  }

  @MessagePattern(inventoryCommands.listKardex)
  listKardex(@Payload() { search }: { search?: string }) {
    return this.inventory.listKardex(search);
  }

  @MessagePattern(inventoryCommands.listMovements)
  listMovements(@Payload() { id }: { id: number }) {
    return this.inventory.listMovements(id);
  }
}
