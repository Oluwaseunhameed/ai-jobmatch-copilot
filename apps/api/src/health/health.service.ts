import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@jobmatch/types';

@Injectable()
export class HealthService {
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
