import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { envPort } from '../shared/config';
import { SqlServer } from '../shared/sql-server';
import { InventoryController } from './inventory.controller';
import { InventoryPort } from './inventory.port';
import { SqlInventory } from './sql-inventory';

@Module({
  controllers: [InventoryController],
  providers: [SqlServer, { provide: InventoryPort, useClass: SqlInventory }],
})
class InventoryModule {}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(InventoryModule, {
    transport: Transport.TCP,
    options: { host: process.env.HOST ?? '0.0.0.0', port: envPort('PORT', 4002) },
  });
  app.enableShutdownHooks();
  await app.listen();
}

void bootstrap();
