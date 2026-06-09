import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit.guard';
import { WorkspacesService } from './workspaces.service';

/** Unauthenticated, read-only access to PUBLIC workspaces (share links). */
@Controller('public')
export class PublicController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Public()
  @RateLimit({ limit: 60, windowSec: 60 })
  @Get('workspaces/:id')
  getWorkspace(@Param('id') id: string) {
    return this.workspaces.getPublic(id);
  }
}
