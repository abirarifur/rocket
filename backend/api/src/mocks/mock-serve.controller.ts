import { All, Controller, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/jwt-auth.guard';
import { RateLimit } from '../common/rate-limit.guard';
import { MocksService } from './mocks.service';

/**
 * Public mock endpoint. A mock server is hosted at /api/mock/:id and matches
 * the remaining path + HTTP method against its configured routes.
 */
@Controller('mock')
export class MockServeController {
  constructor(private readonly mocks: MocksService) {}

  @Public()
  @RateLimit({ limit: 600, windowSec: 60 })
  @All(':id')
  root(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return this.serve(id, req, res);
  }

  @Public()
  @RateLimit({ limit: 600, windowSec: 60 })
  @All(':id/*splat')
  sub(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return this.serve(id, req, res);
  }

  private async serve(id: string, req: Request, res: Response) {
    const prefix = `/api/mock/${id}`;
    const fullPath = (req.originalUrl.split('?')[0] ?? '').slice(prefix.length) || '/';
    const route = await this.mocks.match(id, req.method, fullPath);
    if (!route) {
      res.status(404).json({ error: 'No matching mock route', method: req.method, path: fullPath });
      return;
    }
    res.status(route.status);
    res.setHeader('Content-Type', route.contentType);
    if (route.headers) {
      for (const [k, v] of Object.entries(route.headers)) res.setHeader(k, v);
    }
    res.send(route.body);
  }
}
