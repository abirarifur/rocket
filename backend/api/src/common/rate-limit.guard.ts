import {
  CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export const RATE_LIMIT_KEY = 'rate_limit';

/** Override the default rate limit on a specific route/controller. */
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);

const DEFAULT: RateLimitOptions = { limit: 120, windowSec: 60 };

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE). Keyed by the
 * authenticated user when present, otherwise by client IP. Works across
 * horizontally-scaled API instances because the counter lives in Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? DEFAULT;

    const req = ctx.switchToHttp().getRequest<Request & { userId?: string }>();
    const identity = req.userId ?? req.ip ?? 'anonymous';
    const routeKey = `${req.method}:${req.route?.path ?? req.path}`;
    const key = `rl:${routeKey}:${identity}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, opts.windowSec);
    }

    if (count > opts.limit) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        { message: 'Too many requests', retryAfterSec: ttl },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
