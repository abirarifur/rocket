import { BadRequestException, Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthService } from '../auth.service';
import { Public } from '../jwt-auth.guard';
import { setAuthCookies } from '../cookies';
import {
  buildAuthorizeUrl,
  callbackUrl,
  configuredProviders,
  exchangeCode,
  fetchProfile,
  getProviderConfig,
  type OAuthProfile,
} from './providers';

const STATE_COOKIE = 'rocket_oauth_state';
const isMockEnabled = () => process.env.MOCK_OAUTH === '1' && process.env.NODE_ENV !== 'production';

@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('providers')
  providers() {
    return { providers: configuredProviders() };
  }

  @Public()
  @Get(':provider')
  start(
    @Param('provider') provider: string,
    @Query('email') email: string | undefined,
    @Res() res: Response,
  ) {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 10 * 60 * 1000,
    });

    if (provider === 'mock' && isMockEnabled()) {
      // Skip the external round-trip: bounce straight to the callback.
      const fakeCode = email || 'mock-user@rocket.dev';
      return res.redirect(`${callbackUrl('mock')}?code=${encodeURIComponent(fakeCode)}&state=${state}`);
    }
    if (!getProviderConfig(provider)) throw new BadRequestException('Provider not configured');
    return res.redirect(buildAuthorizeUrl(provider, state));
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expected = (req.cookies as Record<string, string> | undefined)?.[STATE_COOKIE];
    if (!expected || expected !== state) {
      throw new BadRequestException('Invalid OAuth state');
    }
    res.clearCookie(STATE_COOKIE, { path: '/api/auth' });

    let profile: OAuthProfile;
    if (provider === 'mock' && isMockEnabled()) {
      profile = { providerAccountId: code, email: code, name: code.split('@')[0] };
    } else {
      const token = await exchangeCode(provider, code);
      profile = await fetchProfile(provider, token);
    }

    const tokens = await this.auth.loginWithOAuth(provider, profile);
    setAuthCookies(res, tokens);
    return res.redirect(`${process.env.WEB_ORIGIN ?? 'http://localhost:3001'}/app`);
  }
}
