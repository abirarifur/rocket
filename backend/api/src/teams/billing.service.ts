import { Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { QuotaService } from '../quota/quota.service';

/**
 * Plan + usage. setPlan is a dev stub that flips the plan directly; in
 * production a Stripe checkout/webhook would drive plan changes (the same
 * `team.plan` field), keeping quota enforcement unchanged.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly quota: QuotaService,
  ) {}

  async get(userId: string, teamId: string) {
    await this.tenancy.assertTeamRole(userId, teamId);
    return this.quota.usage(teamId);
  }

  async setPlan(userId: string, teamId: string, plan: Plan) {
    await this.tenancy.assertTeamRole(userId, teamId, 'OWNER');
    await this.prisma.team.update({ where: { id: teamId }, data: { plan } });
    return this.quota.usage(teamId);
  }
}
