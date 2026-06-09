import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TeamsService } from './teams.service';
import {
  AcceptInviteSchema,
  ChangeRoleSchema,
  InviteSchema,
  type AcceptInviteDto,
  type ChangeRoleDto,
  type InviteDto,
} from './teams.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get('teams/:teamId/members')
  members(@CurrentUser() u: AccessTokenPayload, @Param('teamId') teamId: string) {
    return this.teams.listMembers(u.sub, teamId);
  }

  @Get('teams/:teamId/invitations')
  invitations(@CurrentUser() u: AccessTokenPayload, @Param('teamId') teamId: string) {
    return this.teams.listInvitations(u.sub, teamId);
  }

  @Post('teams/:teamId/invitations')
  invite(
    @CurrentUser() u: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(InviteSchema)) dto: InviteDto,
  ) {
    return this.teams.invite(u.sub, teamId, dto);
  }

  @Post('invitations/accept')
  accept(
    @CurrentUser() u: AccessTokenPayload,
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.teams.accept(u.sub, dto.token);
  }

  @Delete('invitations/:id')
  revoke(@CurrentUser() u: AccessTokenPayload, @Param('id') id: string) {
    return this.teams.revokeInvitation(u.sub, id);
  }

  @Patch('teams/:teamId/members/:userId')
  changeRole(
    @CurrentUser() u: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(ChangeRoleSchema)) dto: ChangeRoleDto,
  ) {
    return this.teams.changeRole(u.sub, teamId, userId, dto);
  }

  @Delete('teams/:teamId/members/:userId')
  removeMember(
    @CurrentUser() u: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teams.removeMember(u.sub, teamId, userId);
  }
}
