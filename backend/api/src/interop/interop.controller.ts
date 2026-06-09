import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { InteropService } from './interop.service';
import { CurlImportSchema, ImportSchema, type CurlImportDto, type ImportDto } from './interop.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class InteropController {
  constructor(private readonly interop: InteropService) {}

  @Post('workspaces/:workspaceId/import')
  import(
    @CurrentUser() user: AccessTokenPayload,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(ImportSchema)) dto: ImportDto,
  ) {
    return this.interop.importCollection(user.sub, workspaceId, dto.type, dto.content);
  }

  @Get('collections/:id/export')
  export(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.interop.exportCollection(user.sub, id);
  }

  @Post('import/curl')
  curl(
    @CurrentUser() _user: AccessTokenPayload,
    @Body(new ZodValidationPipe(CurlImportSchema)) dto: CurlImportDto,
  ) {
    return this.interop.parseCurl(dto.command);
  }
}
