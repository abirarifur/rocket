import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EnvironmentsService } from './environments.service';
import {
  CreateEnvironmentSchema,
  UpdateEnvironmentSchema,
  type CreateEnvironmentDto,
  type UpdateEnvironmentDto,
} from './environments.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class EnvironmentsController {
  constructor(private readonly environments: EnvironmentsService) {}

  @Get('workspaces/:workspaceId/environments')
  list(@CurrentUser() user: AccessTokenPayload, @Param('workspaceId') workspaceId: string) {
    return this.environments.list(user.sub, workspaceId);
  }

  @Post('workspaces/:workspaceId/environments')
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(CreateEnvironmentSchema)) dto: CreateEnvironmentDto,
  ) {
    return this.environments.create(user.sub, workspaceId, dto);
  }

  @Get('environments/:id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.environments.get(user.sub, id);
  }

  @Patch('environments/:id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEnvironmentSchema)) dto: UpdateEnvironmentDto,
  ) {
    return this.environments.update(user.sub, id, dto);
  }

  @Delete('environments/:id')
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.environments.remove(user.sub, id);
  }
}
