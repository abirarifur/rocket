import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MonitorsService } from './monitors.service';
import {
  CreateMonitorSchema,
  UpdateMonitorSchema,
  type CreateMonitorDto,
  type UpdateMonitorDto,
} from './monitors.schemas';

@UseGuards(JwtAuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitors: MonitorsService) {}

  @Get()
  list(@CurrentUser() u: AccessTokenPayload, @Query('workspaceId') workspaceId: string) {
    return this.monitors.list(u.sub, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() u: AccessTokenPayload,
    @Body(new ZodValidationPipe(CreateMonitorSchema)) dto: CreateMonitorDto,
  ) {
    return this.monitors.create(u.sub, dto);
  }

  @Get(':id/runs')
  history(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.monitors.history(u.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMonitorSchema)) dto: UpdateMonitorDto,
  ) {
    return this.monitors.update(u.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.monitors.remove(u.sub, id);
  }
}
