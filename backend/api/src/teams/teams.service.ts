import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, TeamRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService, ROLE_RANK } from '../tenancy/tenancy.service';
import { MailService } from '../mail/mail.service';
import type { ChangeRoleDto, InviteDto } from './teams.schemas';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly mail: MailService,
  ) {}

  async listMembers(userId: string, teamId: string) {
    await this.tenancy.assertTeamRole(userId, teamId);
    const members = await this.prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    }));
  }

  async listInvitations(userId: string, teamId: string) {
    await this.tenancy.assertTeamRole(userId, teamId, 'ADMIN');
    return this.prisma.invitation.findMany({
      where: { teamId, status: InvitationStatus.PENDING },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    });
  }

  /** Invite a user by email (ADMIN+). Emails an accept link (console in dev). */
  async invite(userId: string, teamId: string, dto: InviteDto) {
    await this.tenancy.assertTeamRole(userId, teamId, 'ADMIN');

    // Already a member?
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      const membership = await this.prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: existing.id, teamId } },
      });
      if (membership) throw new ConflictException('User is already a member');
    }

    const raw = randomBytes(32).toString('hex');
    await this.prisma.invitation.create({
      data: {
        teamId,
        email: dto.email,
        role: dto.role as TeamRole,
        tokenHash: sha256(raw),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    await this.mail.send(
      dto.email,
      `You've been invited to ${team?.name ?? 'a team'} on Rocket`,
      `Accept the invitation: ${this.webBase()}/invite?token=${raw}`,
    );
    return { ok: true };
  }

  /** Accept an invitation as the current user (token is the capability). */
  async accept(userId: string, rawToken: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (
      !invitation ||
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    await this.prisma.$transaction([
      this.prisma.teamMembership.upsert({
        where: { userId_teamId: { userId, teamId: invitation.teamId } },
        update: { role: invitation.role },
        create: { userId, teamId: invitation.teamId, role: invitation.role },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);
    return { ok: true, teamId: invitation.teamId };
  }

  async revokeInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.tenancy.assertTeamRole(userId, invitation.teamId, 'ADMIN');
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
    return { ok: true };
  }

  async changeRole(userId: string, teamId: string, targetUserId: string, dto: ChangeRoleDto) {
    const actorRole = await this.tenancy.assertTeamRole(userId, teamId, 'ADMIN');
    const target = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: targetUserId, teamId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === TeamRole.OWNER) throw new ForbiddenException('Cannot change the owner');
    // An admin cannot grant a role higher than their own.
    if (ROLE_RANK[dto.role as TeamRole] > ROLE_RANK[actorRole]) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }
    await this.prisma.teamMembership.update({
      where: { userId_teamId: { userId: targetUserId, teamId } },
      data: { role: dto.role as TeamRole },
    });
    return { ok: true };
  }

  /** Transfer ownership: only the current OWNER can hand off; they become ADMIN. */
  async transferOwnership(userId: string, teamId: string, targetUserId: string) {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (membership?.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }
    const target = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: targetUserId, teamId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    await this.prisma.$transaction([
      this.prisma.teamMembership.update({
        where: { userId_teamId: { userId: targetUserId, teamId } },
        data: { role: TeamRole.OWNER },
      }),
      this.prisma.teamMembership.update({
        where: { userId_teamId: { userId, teamId } },
        data: { role: TeamRole.ADMIN },
      }),
    ]);
    return { ok: true };
  }

  async removeMember(userId: string, teamId: string, targetUserId: string) {
    await this.tenancy.assertTeamRole(userId, teamId, 'ADMIN');
    const target = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: targetUserId, teamId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === TeamRole.OWNER) throw new ForbiddenException('Cannot remove the owner');
    await this.prisma.teamMembership.delete({
      where: { userId_teamId: { userId: targetUserId, teamId } },
    });
    return { ok: true };
  }

  private webBase(): string {
    return process.env.WEB_ORIGIN ?? 'http://localhost:3001';
  }
}
