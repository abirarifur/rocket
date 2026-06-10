import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RunsController } from './runs.controller';
import { RunsService, RUNS_QUEUE } from './runs.service';
import { RunsProcessor } from './runs.processor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: RUNS_QUEUE })],
  controllers: [RunsController],
  providers: [RunsService, RunsProcessor],
  exports: [RunsService],
})
export class RunsModule {}
