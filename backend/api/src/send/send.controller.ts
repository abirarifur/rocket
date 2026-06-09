import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RateLimit } from '../common/rate-limit.guard';
import { SendService } from './send.service';
import { SendRequestSchema, type SendRequestDto } from './send.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class SendController {
  constructor(private readonly send: SendService) {}

  @RateLimit({ limit: 120, windowSec: 60 })
  @Post('send')
  execute(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(SendRequestSchema)) dto: SendRequestDto,
  ) {
    return this.send.send(user.sub, dto.workspaceId, dto.request);
  }

  @Get('workspaces/:workspaceId/history')
  history(@CurrentUser() user: AccessTokenPayload, @Param('workspaceId') workspaceId: string) {
    return this.send.history(user.sub, workspaceId);
  }
}
