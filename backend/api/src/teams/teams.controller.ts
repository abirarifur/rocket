import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AccessTokenPayload } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TeamsService } from './teams.service';
import { GlobalsService } from './globals.service';
import {
  AcceptInviteSchema,
  ChangeRoleSchema,
  InviteSchema,
  SetGlobalsSchema,
  TransferOwnershipSchema,
  type AcceptInviteDto,
  type ChangeRoleDto,
  type InviteDto,
  type SetGlobalsDto,
  type TransferOwnershipDto,
} from './teams.schemas';

@UseGuards(JwtAuthGuard)
@Controller()
export class TeamsController {
  constructor(
    private readonly teams: TeamsService,
    private readonly globals: GlobalsService,
  ) {}

  @Get('teams/:teamId/globals')
  getGlobals(@CurrentUser() u: AccessTokenPayload, @Param('teamId') teamId: string) {
    return this.globals.get(u.sub, teamId);
  }

  @Put('teams/:teamId/globals')
  setGlobals(
    @CurrentUser() u: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(SetGlobalsSchema)) dto: SetGlobalsDto,
  ) {
    return this.globals.set(u.sub, teamId, dto.variables);
  }

  @Post('teams/:teamId/transfer-ownership')
  transfer(
    @CurrentUser() u: AccessTokenPayload,
    @Param('teamId') teamId: string,
    @Body(new ZodValidationPipe(TransferOwnershipSchema)) dto: TransferOwnershipDto,
  ) {
    return this.teams.transferOwnership(u.sub, teamId, dto.userId);
  }

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
