/** Runtime configuration for the proxy service, read from the environment. */
export const config = {
  port: Number(process.env.PROXY_PORT ?? 4100),
  maxResponseBytes: Number(process.env.PROXY_MAX_RESPONSE_BYTES ?? 10_485_760),
  timeoutMs: Number(process.env.PROXY_TIMEOUT_MS ?? 30_000),
  // Web origin allowed to call the proxy directly in dev.
  corsOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
};
