import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ProxyRequestSchema, type ProxyError, type ProxyResponse } from '@rocket/types';
import { config } from './config.js';
import { assertSafeUrl } from './ssrf.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: config.corsOrigin });

app.get('/health', async () => ({ status: 'ok', service: 'proxy' }));

app.post('/proxy', async (req, reply) => {
  const parsed = ProxyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const err: ProxyError = { error: 'Invalid proxy request', code: 'INVALID_URL' };
    return reply.code(400).send(err);
  }
  const spec = parsed.data;

  // SSRF guard — refuse private / loopback / metadata targets.
  const verdict = await assertSafeUrl(spec.url);
  if (!verdict.ok) {
    const code =
      verdict.reason === 'BLOCKED_SSRF'
        ? 'BLOCKED_SSRF'
        : verdict.reason === 'INVALID_URL'
          ? 'INVALID_URL'
          : 'CONNECTION_FAILED';
    const err: ProxyError = { error: `Request refused: ${verdict.reason}`, code };
    return reply.code(code === 'BLOCKED_SSRF' ? 403 : 400).send(err);
  }

  const started = process.hrtime.bigint();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    spec.timeoutMs ?? config.timeoutMs,
  );
  try {
    const res = await fetch(spec.url, {
      method: spec.method,
      headers: spec.headers,
      body: spec.body ?? undefined,
      redirect: spec.followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
    });

    // Read the body with a hard size cap to protect memory.
    const chunks: Buffer[] = [];
    let total = 0;
    let truncated = false;
    const reader = res.body?.getReader();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const buf = Buffer.from(value);
        total += buf.length;
        if (total > config.maxResponseBytes) {
          truncated = true;
          const remaining = config.maxResponseBytes - (total - buf.length);
          if (remaining > 0) chunks.push(buf.subarray(0, remaining));
          await reader.cancel();
          break;
        }
        chunks.push(buf);
      }
    }

    const bodyText = Buffer.concat(chunks).toString('utf8');
    const timeMs = Number(process.hrtime.bigint() - started) / 1e6;

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const out: ProxyResponse = {
      status: res.status,
      statusText: res.statusText,
      headers,
      body: bodyText,
      truncated,
      timeMs,
      sizeBytes: total,
    };
    return reply.send(out);
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    const err: ProxyError = {
      error: isTimeout ? 'Request timed out' : e instanceof Error ? e.message : 'Request failed',
      code: isTimeout ? 'TIMEOUT' : 'CONNECTION_FAILED',
    };
    return reply.code(isTimeout ? 504 : 502).send(err);
  } finally {
    clearTimeout(timeout);
  }
});

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then(() => app.log.info(`proxy listening on :${config.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
