export const config = {
  port: Number(process.env.RUNNER_PORT ?? 4200),
  corsOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
  // pm.sendRequest is routed through the proxy so SSRF protection still applies.
  proxyBase: process.env.PROXY_BASE_URL ?? 'http://localhost:4100',
};
