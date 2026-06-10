import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RunScriptRequestSchema } from '@rocket/types';
import { config } from './config.js';
import { runScript } from './sandbox.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: config.corsOrigin });

app.get('/health', async () => ({ status: 'ok', service: 'runner' }));

app.post('/run', async (req, reply) => {
  const parsed = RunScriptRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid run request' });
  }
  // Time-boxed inside the sandbox; awaits async pm.sendRequest if used.
  return reply.send(await runScript(parsed.data, config.proxyBase));
});

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then(() => app.log.info(`runner listening on :${config.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
