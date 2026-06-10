import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Liveness: the process is up. Cheap, no dependency checks. */
  @Get('health')
  health() {
    return { status: 'ok', service: 'api' };
  }

  /** Readiness: dependencies reachable. Returns 503 if any are down. */
  @Get('ready')
  async ready() {
    const [db, redis] = await Promise.all([
      this.check(() => this.prisma.$queryRaw`SELECT 1`),
      this.check(() => this.redis.ping()),
    ]);
    if (!db || !redis) {
      throw new HttpException(
        { status: 'unavailable', db: db ? 'up' : 'down', redis: redis ? 'up' : 'down' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'ready', db: 'up', redis: 'up' };
  }

  private async check(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch {
      return false;
    }
  }
}
