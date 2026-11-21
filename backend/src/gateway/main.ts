import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { envPort, requiredEnv } from '../shared/config';
import { GatewayModule } from './gateway.module';
import { ACCESS_COOKIE } from './session';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(GatewayModule);
  const port = envPort('PORT', 3001);
  const frontendOrigin = requiredEnv('FRONTEND_ORIGIN');
  const docsOrigin = process.env.GATEWAY_ORIGIN ?? `http://localhost:${port}`;
  const trustedOrigins = new Set([frontendOrigin, docsOrigin]);
  const readMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
  app.enableCors({
    origin: [frontendOrigin],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  });
  app.use(cookieParser());
  app.use('/api', (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!readMethods.has(request.method) && !trustedOrigins.has(request.get('Origin') ?? '')) {
      response.status(403).json({ statusCode: 403, message: 'Origen de la solicitud inválido.' });
      return;
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Inventario HCE')
    .setDescription('Catálogo de insumos, compras, ventas y movimientos por lote.')
    .setVersion('1.0.0')
    .addCookieAuth(ACCESS_COOKIE, { type: 'apiKey', in: 'cookie' }, ACCESS_COOKIE)
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApiConfig), {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { withCredentials: true },
  });

  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error desconocido.';
  new Logger('Gateway').error(message);
  process.exitCode = 1;
});
