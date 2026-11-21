import {
  Body, Controller, Get, HttpCode, Injectable, Post, Req, Res, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ApiCookieAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiTags,
  ApiTooManyRequestsResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { requiredEnv } from '../shared/config';
import { LoginDto, SessionDto } from './dto';
import { ACCESS_COOKIE, Public, type SessionRequest } from './session';

export const SESSION_SECONDS = 30 * 60;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/api',
  secure: process.env.COOKIE_SECURE === 'true',
};

function credentialHash(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

@Injectable()
export class DemoAuth {
  private readonly username = requiredEnv('DEMO_USERNAME');
  private readonly usernameHash = credentialHash(this.username);
  private readonly passwordHash = credentialHash(requiredEnv('DEMO_PASSWORD'));

  constructor(private readonly jwt: JwtService) {}

  async login(credentials: LoginDto): Promise<{ session: SessionDto; token: string }> {
    const usernameMatches = timingSafeEqual(credentialHash(credentials.username), this.usernameHash);
    const passwordMatches = timingSafeEqual(credentialHash(credentials.password), this.passwordHash);
    if (!usernameMatches || !passwordMatches) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    return {
      session: { username: this.username, expiresIn: SESSION_SECONDS },
      token: await this.jwt.signAsync({ sub: this.username }),
    };
  }
}

@ApiTags('Sesión')
@ApiUnauthorizedResponse({ description: 'Credenciales incorrectas o sesión ausente o vencida.' })
@ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido.' })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: DemoAuth) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionDto, description: 'Emite la cookie de sesión HttpOnly.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  async login(@Body() credentials: LoginDto, @Res({ passthrough: true }) response: Response): Promise<SessionDto> {
    const { session, token } = await this.auth.login(credentials);
    response.cookie(ACCESS_COOKIE, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
    return session;
  }

  @Get('session')
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiOkResponse({ type: SessionDto })
  session(@Req() request: Request & SessionRequest): SessionDto {
    const { sub, exp } = request.sessionClaims;
    return { username: sub, expiresIn: exp - Math.floor(Date.now() / 1000) };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiNoContentResponse({ description: 'Elimina la cookie de sesión.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(ACCESS_COOKIE, cookieOptions);
  }
}
