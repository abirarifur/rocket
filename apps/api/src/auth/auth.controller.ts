import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RateLimit } from '../common/rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard, Public, type AccessTokenPayload } from './jwt-auth.guard';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies';
import {
  LoginSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  type LoginDto,
  type RegisterDto,
  type RequestPasswordResetDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
} from './auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit({ limit: 10, windowSec: 60 })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto);
    setAuthCookies(res, tokens);
    const me = await this.decode(tokens.accessToken);
    return this.auth.me(me.sub);
  }

  @Public()
  @RateLimit({ limit: 20, windowSec: 60 })
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto);
    setAuthCookies(res, tokens);
    const me = await this.decode(tokens.accessToken);
    return this.auth.me(me.sub);
  }

  @Public()
  @RateLimit({ limit: 60, windowSec: 60 })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const tokens = await this.auth.refresh(raw ?? '');
    setAuthCookies(res, tokens);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await this.auth.logout(raw);
    clearAuthCookies(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user.sub);
  }

  @Public()
  @RateLimit({ limit: 30, windowSec: 60 })
  @Post('verify-email')
  async verifyEmail(@Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { ok: true };
  }

  @Public()
  @RateLimit({ limit: 5, windowSec: 60 })
  @Post('request-password-reset')
  async requestPasswordReset(
    @Body(new ZodValidationPipe(RequestPasswordResetSchema)) dto: RequestPasswordResetDto,
  ) {
    await this.auth.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Public()
  @RateLimit({ limit: 10, windowSec: 60 })
  @Post('reset-password')
  async resetPassword(@Body(new ZodValidationPipe(ResetPasswordSchema)) dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { ok: true };
  }

  /** Decode (already-signed) access token to read the user id without re-querying. */
  private async decode(accessToken: string): Promise<AccessTokenPayload> {
    const [, payload] = accessToken.split('.');
    return JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8')) as AccessTokenPayload;
  }
}
