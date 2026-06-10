import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /** Prometheus scrape endpoint (no auth; restrict at the network layer in prod). */
  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  render() {
    return this.metrics.render();
  }
}
