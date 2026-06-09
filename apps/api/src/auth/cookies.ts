import type { CookieOptions, Response } from 'express';
import type { IssuedTokens } from './auth.service';

export const ACCESS_COOKIE = 'rocket_at';
export const REFRESH_COOKIE = 'rocket_rt';

const isProd = process.env.NODE_ENV === 'production';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  };
}

export function setAuthCookies(res: Response, tokens: IssuedTokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: Number(process.env.JWT_ACCESS_TTL ?? 900) * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    // Refresh cookie only travels to the auth routes.
    path: '/api/auth',
    maxAge: Number(process.env.JWT_REFRESH_TTL ?? 1209600) * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions() });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: '/api/auth' });
}
