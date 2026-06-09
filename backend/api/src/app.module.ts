import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { CryptoModule } from './crypto/crypto.module';
import { ExecutionModule } from './execution/execution.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { CollectionsModule } from './collections/collections.module';
import { EnvironmentsModule } from './environments/environments.module';
import { TeamsModule } from './teams/teams.module';
import { SendModule } from './send/send.module';
import { RunsModule } from './runs/runs.module';
import { InteropModule } from './interop/interop.module';
import { RateLimitGuard } from './common/rate-limit.guard';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    BullModule.forRoot({
      connection: { host: redisUrl.hostname, port: Number(redisUrl.port) || 6379 },
    }),
    PrismaModule,
    RedisModule,
    TenancyModule,
    CryptoModule,
    ExecutionModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    CollectionsModule,
    EnvironmentsModule,
    TeamsModule,
    SendModule,
    RunsModule,
    InteropModule,
  ],
  providers: [
    // Global Redis-backed rate limiting (per-route overrides via @RateLimit).
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
