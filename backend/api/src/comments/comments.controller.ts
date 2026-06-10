import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CommentsService } from './comments.service';
import { CreateCommentSchema, type CreateCommentDto } from './comments.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('collections/:id/comments')
  list(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.comments.list(u.sub, id);
  }

  @Post('collections/:id/comments')
  create(
    @CurrentUser() u: AccessTokenPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCommentSchema)) dto: CreateCommentDto,
  ) {
    return this.comments.create(u.sub, id, dto);
  }

  @Delete('comments/:id')
  remove(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.comments.remove(u.sub, id);
  }
}
