import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { CryptoModule } from './crypto/crypto.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { CollectionsModule } from './collections/collections.module';
import { EnvironmentsModule } from './environments/environments.module';
import { TeamsModule } from './teams/teams.module';
import { SendModule } from './send/send.module';
import { RateLimitGuard } from './common/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    RedisModule,
    TenancyModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    CollectionsModule,
    EnvironmentsModule,
    TeamsModule,
    SendModule,
  ],
  providers: [
    // Global Redis-backed rate limiting (per-route overrides via @RateLimit).
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
