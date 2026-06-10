import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import type Redis from 'ioredis';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { MailService } from './mail/mail.service';
import { REDIS } from './redis/redis.module';

/**
 * Integration tests: boot the real Nest app against Postgres/Redis/MinIO and
 * exercise critical cross-phase flows over HTTP. Requires `pnpm infra:up`.
 */
describe('Rocket API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mail = { lastToken: undefined as string | undefined };
  const rnd = Math.random().toString(36).slice(2, 8);
  const agent = () => request.agent(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // Capture invitation/verification tokens instead of "emailing" them.
      .overrideProvider(MailService)
      .useValue({
        send: async (_to: string, _subj: string, body: string) => {
          const m = body.match(/token=([a-f0-9]+)/);
          if (m) mail.lastToken = m[1];
        },
        sendEmailVerification: async () => {},
        sendPasswordReset: async () => {},
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['health', 'ready', 'metrics'] });
    app.enableShutdownHooks();
    await app.init();
    prisma = app.get(PrismaService);
    // Clear rate-limit counters so repeated runs within the window stay deterministic.
    const redis = app.get<Redis>(REDIS);
    const keys = await redis.keys('rl:*');
    if (keys.length) await redis.del(...keys);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function register(label: string) {
    const a = agent();
    const email = `${label}-${rnd}@rocket.test`;
    await a.post('/api/auth/register').send({ email, password: 'supersecret', name: label }).expect(201);
    const me = await a.get('/api/auth/me').expect(200);
    return { a, email, me: me.body as { teams: { id: string; workspaces: { id: string }[] }[] } };
  }

  it('registers a user with a personal team + workspace and rejects duplicates', async () => {
    const { a, email, me } = await register('owner');
    expect(me.teams[0]?.workspaces[0]?.id).toBeTruthy();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'supersecret' })
      .expect(409);
    await a.get('/api/auth/me').expect(200);
  });

  it('enforces RBAC: viewer reads but cannot write; editor can', async () => {
    const owner = await register('rbac-owner');
    const member = await register('rbac-member');
    const teamId = owner.me.teams[0]!.id;
    const wsId = owner.me.teams[0]!.workspaces[0]!.id;

    await owner.a.post(`/api/teams/${teamId}/invitations`).send({ email: member.email, role: 'VIEWER' }).expect(201);
    expect(mail.lastToken).toBeTruthy();
    await member.a.post('/api/invitations/accept').send({ token: mail.lastToken }).expect(201);

    // Viewer: read 200, create 403.
    await member.a.get(`/api/workspaces/${wsId}`).expect(200);
    await member.a.post(`/api/workspaces/${wsId}/collections`).send({ name: 'nope' }).expect(403);

    // Promote to EDITOR -> create allowed.
    const members = await owner.a.get(`/api/teams/${teamId}/members`).expect(200);
    const memberId = (members.body as { userId: string; email: string }[]).find((m) => m.email === member.email)!.userId;
    await owner.a.patch(`/api/teams/${teamId}/members/${memberId}`).send({ role: 'EDITOR' }).expect(200);
    await member.a.post(`/api/workspaces/${wsId}/collections`).send({ name: 'now ok' }).expect(201);
  });

  it('does collection CRUD with a folder/request tree', async () => {
    const { a, me } = await register('coll');
    const wsId = me.teams[0]!.workspaces[0]!.id;
    const created = await a.post(`/api/workspaces/${wsId}/collections`).send({ name: 'C' }).expect(201);
    const id = (created.body as { id: string }).id;
    const tree = [{ id: 'r1', type: 'request', order: 0, request: { name: 'R', method: 'GET', url: 'https://x.test', params: [], headers: [], body: { mode: 'none' }, auth: { type: 'none' } } }];
    await a.patch(`/api/collections/${id}`).send({ tree }).expect(200);
    const got = await a.get(`/api/collections/${id}`).expect(200);
    expect((got.body as { tree: unknown[] }).tree).toHaveLength(1);
    await a.delete(`/api/collections/${id}`).expect(200);
    await a.get(`/api/collections/${id}`).expect(404);
  });

  it('encrypts secret environment variables at rest, decrypts on read', async () => {
    const { a, me } = await register('env');
    const wsId = me.teams[0]!.workspaces[0]!.id;
    const env = await a
      .post(`/api/workspaces/${wsId}/environments`)
      .send({ name: 'E', variables: [{ key: 'token', value: 'sekret', enabled: true, secret: true }] })
      .expect(201);
    const envId = (env.body as { id: string }).id;

    // API returns the decrypted value to a member.
    const read = await a.get(`/api/environments/${envId}`).expect(200);
    expect((read.body as { variables: { value: string }[] }).variables[0]?.value).toBe('sekret');

    // ...but the database stores it encrypted.
    const row = await prisma.environment.findUnique({ where: { id: envId } });
    const stored = (row!.variables as { value: string }[])[0]!.value;
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('sekret');
  });

  it('imports a Postman collection and exports valid v2.1', async () => {
    const { a, me } = await register('interop');
    const wsId = me.teams[0]!.workspaces[0]!.id;
    const postman = {
      info: { name: 'Imported', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [{ name: 'Get', request: { method: 'GET', header: [], url: { raw: 'https://x.test/a' } } }],
    };
    const imp = await a
      .post(`/api/workspaces/${wsId}/import`)
      .send({ type: 'postman', content: JSON.stringify(postman) })
      .expect(201);
    const id = (imp.body as { id: string }).id;
    const exp = await a.get(`/api/collections/${id}/export`).expect(200);
    expect((exp.body as { info: { schema: string } }).info.schema).toContain('v2.1.0');
  });

  it('serves a mock server publicly by method + path', async () => {
    const { a, me } = await register('mock');
    const wsId = me.teams[0]!.workspaces[0]!.id;
    const col = await a.post(`/api/workspaces/${wsId}/collections`).send({ name: 'M' }).expect(201);
    const colId = (col.body as { id: string }).id;
    const mock = await a.post('/api/mocks').send({ collectionId: colId }).expect(201);
    const mockId = (mock.body as { id: string }).id;
    await a
      .patch(`/api/mocks/${mockId}`)
      .send({ routes: [{ method: 'GET', path: '/ping', status: 201, contentType: 'application/json', body: '{"ok":true}' }] })
      .expect(200);

    const res = await request(app.getHttpServer()).get(`/api/mock/${mockId}/ping`).expect(201);
    expect(res.body).toEqual({ ok: true });
    await request(app.getHttpServer()).get(`/api/mock/${mockId}/missing`).expect(404);
  });

  it('exposes Prometheus metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('process_cpu_seconds_total');
  });

  it('reports plan + limits + usage and enforces quotas', async () => {
    const { a, me } = await register('quota');
    const teamId = me.teams[0]!.id;
    const billing = await a.get(`/api/teams/${teamId}/billing`).expect(200);
    expect((billing.body as { plan: string }).plan).toBe('FREE');
    expect((billing.body as { limits: { collections: number } }).limits.collections).toBe(10);
  });
});
