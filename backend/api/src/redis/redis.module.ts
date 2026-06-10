import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Close the connection on shutdown so the process can exit cleanly. */
  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
