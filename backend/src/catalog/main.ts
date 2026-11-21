import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type TcpOptions } from '@nestjs/microservices';
import { envPort } from '../shared/config';
import { SqlServer } from '../shared/sql-server';
import { CatalogController } from './catalog.controller';
import { CATALOG_REPOSITORY } from './catalog.repository';
import { SqlCatalogRepository } from './sql-catalog.repository';

@Module({
  controllers: [CatalogController],
  providers: [SqlServer, { provide: CATALOG_REPOSITORY, useClass: SqlCatalogRepository }],
})
class CatalogModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<TcpOptions>(CatalogModule, {
    transport: Transport.TCP,
    options: { host: process.env.HOST ?? '0.0.0.0', port: envPort('PORT', 4001) },
  });
  app.enableShutdownHooks();
  await app.listen();
}

void bootstrap();
