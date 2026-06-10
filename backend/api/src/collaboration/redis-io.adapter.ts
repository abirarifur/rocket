import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions, Server } from 'socket.io';

/**
 * socket.io adapter backed by Redis pub/sub so presence and live events are
 * broadcast across all API replicas (not just the instance a client is on).
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const pub = new Redis(url, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    this.adapterConstructor = createAdapter(pub, sub);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
