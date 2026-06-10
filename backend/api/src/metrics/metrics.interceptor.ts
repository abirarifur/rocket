import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize } from 'rxjs';
import { MetricsService } from './metrics.service';

/** Records request count + duration into Prometheus, labeled by route template. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Request>();
    const start = process.hrtime.bigint();
    // Route template (e.g. /collections/:id) keeps label cardinality bounded.
    const route = `${req.baseUrl ?? ''}${req.route?.path ?? req.path}`;
    return next.handle().pipe(
      finalize(() => {
        const res = ctx.switchToHttp().getResponse<Response>();
        const seconds = Number(process.hrtime.bigint() - start) / 1e9;
        this.metrics.observe(req.method, route || 'unknown', res.statusCode, seconds);
      }),
    );
  }
}
