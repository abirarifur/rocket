import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Variable } from '@rocket/types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { CryptoService } from '../crypto/crypto.service';

/** Team-wide (global) variables — lowest-precedence scope, secrets encrypted. */
@Injectable()
export class GlobalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  private encrypt(vars: Variable[]): Variable[] {
    return vars.map((v) =>
      v.secret && v.value && !this.crypto.isEncrypted(v.value)
        ? { ...v, value: this.crypto.encrypt(v.value) }
        : v,
    );
  }
  private decrypt(vars: Variable[]): Variable[] {
    return vars.map((v) => (v.secret && v.value ? { ...v, value: this.crypto.decrypt(v.value) } : v));
  }

  async get(userId: string, teamId: string): Promise<Variable[]> {
    await this.tenancy.assertTeamRole(userId, teamId);
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    return this.decrypt(team.globals as unknown as Variable[]);
  }

  async set(userId: string, teamId: string, variables: Variable[]): Promise<Variable[]> {
    await this.tenancy.assertTeamRole(userId, teamId, 'EDITOR');
    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: { globals: this.encrypt(variables) as unknown as Prisma.InputJsonValue },
    });
    return this.decrypt(team.globals as unknown as Variable[]);
  }
}
