import { PrismaClient, TeamRole, WorkspaceVisibility } from '@prisma/client';

const prisma = new PrismaClient();

/** Minimal seed: a demo user with a personal team + workspace. */
async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@rocket.dev' },
    update: {},
    create: { email: 'demo@rocket.dev', name: 'Demo User' },
  });

  const team = await prisma.team.create({ data: { name: "Demo's Team" } });
  await prisma.teamMembership.create({
    data: { userId: user.id, teamId: team.id, role: TeamRole.OWNER },
  });
  await prisma.workspace.create({
    data: { teamId: team.id, name: 'My Workspace', visibility: WorkspaceVisibility.PERSONAL },
  });

  // eslint-disable-next-line no-console
  console.log('Seeded demo user, team, and workspace.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
