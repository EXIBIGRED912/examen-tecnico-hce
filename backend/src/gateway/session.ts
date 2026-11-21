import { Injectable, SetMetadata, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const ACCESS_COOKIE = 'hce_access';
const PUBLIC = Symbol('public');

export const Public = () => SetMetadata(PUBLIC, true);

export interface SessionRequest {
  sessionClaims: { sub: string; exp: number };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const request = context.switchToHttp().getRequest<Request & SessionRequest>();
    const token: unknown = request.cookies?.[ACCESS_COOKIE];
    if (typeof token !== 'string') throw new UnauthorizedException('Inicia sesión para continuar.');

    try {
      const claims = await this.jwt.verifyAsync<SessionRequest['sessionClaims']>(token);
      if (typeof claims.sub === 'string' && typeof claims.exp === 'number') {
        request.sessionClaims = claims;
        return true;
      }
    } catch {
      throw new UnauthorizedException('La sesión es inválida o ha vencido.');
    }
    throw new UnauthorizedException('La sesión es inválida o ha vencido.');
  }
}
