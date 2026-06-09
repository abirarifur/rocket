import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { RUNS_QUEUE, RunsService } from './runs.service';

interface RunJob {
  runId: string;
  data: { type: 'json' | 'csv'; content: string } | null;
}

/** In-process worker for collection runs (can be split into its own service). */
@Processor(RUNS_QUEUE)
export class RunsProcessor extends WorkerHost {
  constructor(private readonly runs: RunsService) {
    super();
  }

  async process(job: Job<RunJob>): Promise<void> {
    await this.runs.process(job.data.runId, job.data.data);
  }
}
