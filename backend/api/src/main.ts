import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggingInterceptor, requestIdMiddleware } from './common/request-context';
import { RedisIoAdapter } from './collaboration/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Cross-replica socket.io fan-out via Redis pub/sub.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Security headers. CSP is left to the frontend/CDN; this is a JSON API.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'ready', 'metrics'] });
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Close DB/Redis/queue connections on SIGTERM/SIGINT (graceful k8s shutdown).
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`api listening on :${port}`);
}

void bootstrap();
