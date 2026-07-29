import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@jobmatch/types';
import { getConnection, isQueueEnabled } from '@jobmatch/queue';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  check(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  async ready(): Promise<HealthCheckResponse> {
    const checks: NonNullable<HealthCheckResponse['checks']> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    if (isQueueEnabled()) {
      try {
        const pong = await getConnection().ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'error';
      } catch {
        checks.redis = 'error';
      }
    } else {
      checks.redis = 'skipped';
    }

    const hardFail = checks.database === 'error' || checks.redis === 'error';
    return {
      status: hardFail ? 'error' : 'ok',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
