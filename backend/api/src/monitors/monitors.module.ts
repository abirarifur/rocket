import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MonitorsController } from './monitors.controller';
import { MonitorsService, MONITORS_QUEUE } from './monitors.service';
import { MonitorsProcessor } from './monitors.processor';
import { AuthModule } from '../auth/auth.module';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [AuthModule, RunsModule, BullModule.registerQueue({ name: MONITORS_QUEUE })],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsProcessor],
})
export class MonitorsModule {}
