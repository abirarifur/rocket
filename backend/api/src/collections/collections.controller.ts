import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionSchema,
  UpdateCollectionSchema,
  type CreateCollectionDto,
  type UpdateCollectionDto,
} from './collections.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Post('workspaces/:workspaceId/collections')
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(CreateCollectionSchema)) dto: CreateCollectionDto,
  ) {
    return this.collections.create(user.sub, workspaceId, dto);
  }

  @Get('collections/:id')
  get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.collections.get(user.sub, id);
  }

  @Patch('collections/:id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCollectionSchema)) dto: UpdateCollectionDto,
  ) {
    return this.collections.update(user.sub, id, dto);
  }

  @Delete('collections/:id')
  remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.collections.remove(user.sub, id);
  }
}
