import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

/** Prometheus registry + HTTP metrics. */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: 'api' });
    collectDefaultMetrics({ register: this.registry });
  }

  observe(method: string, route: string, status: number, seconds: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequests.inc(labels);
    this.httpDuration.observe(labels, seconds);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}
