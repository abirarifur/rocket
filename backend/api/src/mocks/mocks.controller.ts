import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MocksService } from './mocks.service';
import {
  CreateMockSchema,
  UpdateMockSchema,
  type CreateMockDto,
  type UpdateMockDto,
} from './mocks.schemas';

@UseGuards(JwtAuthGuard)
@Controller('mocks')
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  @Get()
  list(@CurrentUser() u: AccessTokenPayload, @Query('workspaceId') workspaceId: string) {
    return this.mocks.list(u.sub, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() u: AccessTokenPayload,
    @Body(new ZodValidationPipe(CreateMockSchema)) dto: CreateMockDto,
  ) {
    return this.mocks.create(u.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMockSchema)) dto: UpdateMockDto,
  ) {
    return this.mocks.update(u.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.mocks.remove(u.sub, id);
  }
}
