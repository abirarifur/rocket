import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MONITORS_QUEUE, MonitorsService } from './monitors.service';

@Processor(MONITORS_QUEUE)
export class MonitorsProcessor extends WorkerHost {
  constructor(private readonly monitors: MonitorsService) {
    super();
  }

  async process(job: Job<{ monitorId: string }>): Promise<void> {
    await this.monitors.tick(job.data.monitorId);
  }
}
