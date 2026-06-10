import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Primary Prisma client (reads + writes). When DATABASE_REPLICA_URL is set, a
 * second read-only client is created and exposed as `reader` so hot read paths
 * can be routed to a replica. With no replica configured, `reader` is the
 * primary client, so callers need no special-casing.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private replica: PrismaClient | null = null;

  /** Read-only client: the replica when configured, otherwise the primary. */
  reader: PrismaClient = this;

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const replicaUrl = process.env.DATABASE_REPLICA_URL;
    if (replicaUrl) {
      this.replica = new PrismaClient({ datasources: { db: { url: replicaUrl } } });
      await this.replica.$connect();
      this.reader = this.replica;
      this.logger.log('read-replica connected; routing reads to replica');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.replica?.$disconnect();
  }
}
