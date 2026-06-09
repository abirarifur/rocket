import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Variable } from '@rocket/types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { CryptoService } from '../crypto/crypto.service';
import type { CreateEnvironmentDto, UpdateEnvironmentDto } from './environments.schemas';

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  /** Encrypt secret values before persisting (non-secret values stay plaintext). */
  private encryptVars(vars: Variable[]): Variable[] {
    return vars.map((v) =>
      v.secret && v.value && !this.crypto.isEncrypted(v.value)
        ? { ...v, value: this.crypto.encrypt(v.value) }
        : v,
    );
  }

  /** Decrypt secret values for use/display by an authorized member. */
  private decryptVars(vars: Variable[]): Variable[] {
    return vars.map((v) => (v.secret && v.value ? { ...v, value: this.crypto.decrypt(v.value) } : v));
  }

  async list(userId: string, workspaceId: string) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    const envs = await this.prisma.environment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return envs.map((e) => ({ ...e, variables: this.decryptVars(e.variables as Variable[]) }));
  }

  async create(userId: string, workspaceId: string, dto: CreateEnvironmentDto) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    const env = await this.prisma.environment.create({
      data: {
        workspaceId,
        name: dto.name,
        variables: this.encryptVars(dto.variables) as unknown as Prisma.InputJsonValue,
      },
    });
    return { ...env, variables: this.decryptVars(env.variables as Variable[]) };
  }

  async get(userId: string, id: string) {
    const env = await this.tenancy.assertEnvironmentAccess(userId, id);
    return { ...env, variables: this.decryptVars(env.variables as Variable[]) };
  }

  async update(userId: string, id: string, dto: UpdateEnvironmentDto) {
    await this.tenancy.assertEnvironmentAccess(userId, id);
    const data: Prisma.EnvironmentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.variables !== undefined) {
      data.variables = this.encryptVars(dto.variables) as unknown as Prisma.InputJsonValue;
    }
    const env = await this.prisma.environment.update({ where: { id }, data });
    return { ...env, variables: this.decryptVars(env.variables as Variable[]) };
  }

  async remove(userId: string, id: string) {
    await this.tenancy.assertEnvironmentAccess(userId, id);
    await this.prisma.environment.delete({ where: { id } });
    return { ok: true };
  }
}
