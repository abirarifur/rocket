import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenType, TeamRole, WorkspaceVisibility } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.schemas';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /** Register a user and bootstrap their personal team + workspace. */
  async register(dto: RegisterDto): Promise<IssuedTokens> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.bootstrapUser(dto.email, dto.name, passwordHash);
    await this.issueEmailVerification(user.id, user.email);
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id, user.email);
  }

  /** Create a user with their personal team + workspace (shared by register + OAuth). */
  private async bootstrapUser(email: string, name?: string | null, passwordHash?: string) {
    return this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name: name ?? undefined, passwordHash, emailVerified: passwordHash ? null : new Date() },
      });
      const team = await tx.team.create({ data: { name: `${name ?? 'My'}'s Team` } });
      await tx.teamMembership.create({
        data: { userId: u.id, teamId: team.id, role: TeamRole.OWNER },
      });
      await tx.workspace.create({
        data: { teamId: team.id, name: 'My Workspace', visibility: WorkspaceVisibility.PERSONAL },
      });
      return u;
    });
  }

  /**
   * Log in (or sign up) via an OAuth profile: match an existing identity, else
   * link to an existing user by email, else create a new user + workspace.
   */
  async loginWithOAuth(
    provider: string,
    profile: { providerAccountId: string; email: string; name?: string },
  ): Promise<IssuedTokens> {
    const identity = await this.prisma.oAuthIdentity.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });
    if (identity) return this.issueTokens(identity.user.id, identity.user.email);

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) user = await this.bootstrapUser(profile.email, profile.name);

    await this.prisma.oAuthIdentity.create({
      data: { provider, providerAccountId: profile.providerAccountId, userId: user.id },
    });
    return this.issueTokens(user.id, user.email);
  }

  /** Rotate a refresh token: validate, revoke the old, issue a fresh pair. */
  async refresh(rawRefreshToken: string): Promise<IssuedTokens> {
    const tokenHash = sha256(rawRefreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.user.id, record.user.email);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = sha256(rawRefreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { team: { include: { workspaces: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const teams = user.memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
      workspaces: m.team.workspaces.map((w) => ({ id: w.id, name: w.name, visibility: w.visibility })),
    }));
    const defaultWorkspace = teams[0]?.workspaces[0] ?? null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.emailVerified,
      teams,
      defaultWorkspace,
    };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const record = await this.consumeAuthToken(rawToken, AuthTokenType.EMAIL_VERIFY);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always succeed silently to avoid leaking which emails exist.
    if (!user) return;
    const raw = randomBytes(32).toString('hex');
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(raw),
        type: AuthTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await this.mail.sendPasswordReset(user.email, raw);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.consumeAuthToken(dto.token, AuthTokenType.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Revoke all refresh tokens on password change.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async issueTokens(userId: string, email: string): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 900),
      },
    );

    const raw = randomBytes(48).toString('hex');
    const ttlSec = Number(process.env.JWT_REFRESH_TTL ?? 1209600);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + ttlSec * 1000),
      },
    });
    return { accessToken, refreshToken: raw };
  }

  private async issueEmailVerification(userId: string, email: string): Promise<void> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.authToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        type: AuthTokenType.EMAIL_VERIFY,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.mail.sendEmailVerification(email, raw);
  }

  private async consumeAuthToken(rawToken: string, type: AuthTokenType) {
    const record = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }
    await this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return record;
  }
}
