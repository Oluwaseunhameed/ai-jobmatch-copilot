import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthCheckResponse } from '@jobmatch/types';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  check(): HealthCheckResponse {
    return this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — Postgres (+ Redis when configured)' })
  async ready(): Promise<HealthCheckResponse> {
    const result = await this.healthService.ready();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
