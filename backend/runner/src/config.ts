export const config = {
  port: Number(process.env.RUNNER_PORT ?? 4200),
  corsOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
};
