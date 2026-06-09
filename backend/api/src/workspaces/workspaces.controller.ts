import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WorkspacesService } from './workspaces.service';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  type CreateWorkspaceDto,
  type UpdateWorkspaceDto,
} from '../teams/teams.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('workspaces')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.workspaces.listForUser(user.sub);
  }

  @Get('workspaces/:id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.workspaces.getWithCollections(user.sub, id);
  }

  @Post('teams/:teamId/workspaces')
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(CreateWorkspaceSchema)) dto: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(user.sub, teamId, dto);
  }

  @Patch('workspaces/:id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWorkspaceSchema)) dto: UpdateWorkspaceDto,
  ) {
    return this.workspaces.update(user.sub, id, dto);
  }
}
