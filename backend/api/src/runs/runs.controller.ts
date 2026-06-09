import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RateLimit } from '../common/rate-limit.guard';
import { RunsService } from './runs.service';
import { RunCollectionSchema, type RunCollectionDto } from './runs.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @RateLimit({ limit: 30, windowSec: 60 })
  @Post('collections/:id/run')
  run(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RunCollectionSchema)) dto: RunCollectionDto,
  ) {
    return this.runs.enqueue(user.sub, id, dto);
  }

  @Get('collections/:id/runs')
  list(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.runs.listRuns(user.sub, id);
  }

  @Get('runs/:id')
  async get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    const run = await this.runs.getRun(user.sub, id);
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }
}
