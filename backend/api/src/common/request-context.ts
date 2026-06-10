import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { tap } from 'rxjs';

/** Assigns/propagates an x-request-id on every request for traceability. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader('x-request-id', id);
  next();
}

/** Structured access log: method, path, status, duration, request id. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request & { requestId?: string }>();
    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        const res = ctx.switchToHttp().getResponse<Response>();
        const ms = Date.now() - started;
        this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms [${req.requestId}]`);
      }),
    );
  }
}
