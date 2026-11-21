import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envPort, requiredEnv } from '../shared/config';
import { AuthController, DemoAuth, SESSION_SECONDS } from './auth';
import { HealthController, KardexController, ProductsController, PurchasesController, SalesController } from './controllers';
import { CATALOG_CLIENT, InventoryFacade, INVENTORY_CLIENT } from './inventory.facade';
import { SessionGuard } from './session';

@Module({
  imports: [
    JwtModule.register({
      secret: requiredEnv('JWT_SECRET'),
      signOptions: { algorithm: 'HS256', expiresIn: SESSION_SECONDS },
      verifyOptions: { algorithms: ['HS256'] },
    }),
    ClientsModule.register([
      {
        name: CATALOG_CLIENT,
        transport: Transport.TCP,
        options: { host: requiredEnv('CATALOG_HOST'), port: envPort('CATALOG_PORT', 4001) },
      },
      {
        name: INVENTORY_CLIENT,
        transport: Transport.TCP,
        options: { host: requiredEnv('INVENTORY_HOST'), port: envPort('INVENTORY_PORT', 4002) },
      },
    ]),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage: 'Hay demasiadas solicitudes. Vuelve a intentar en un momento.',
    }),
  ],
  controllers: [AuthController, HealthController, ProductsController, PurchasesController, SalesController, KardexController],
  providers: [DemoAuth, InventoryFacade, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class GatewayModule {}
