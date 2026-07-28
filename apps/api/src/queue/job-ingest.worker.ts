import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createLogger, runJobIngest } from '@jobmatch/job-search';

/**
 * Opt-in production ingest loop (fill gap when API is the long-running host).
 * Prefer GitHub Actions schedule for primary cron — see `.github/workflows/job-ingest.yml`.
 *
 * Enable with JOB_INGEST_ENABLED=true (default: off).
 */
@Injectable()
export class JobIngestWorker implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly logger = createLogger('job-ingest-worker');
  private running = false;

  onModuleInit() {
    if (process.env.JOB_INGEST_ENABLED !== 'true') {
      this.logger.log('info', 'worker.disabled', {
        reason: 'JOB_INGEST_ENABLED is not true (use GitHub Actions schedule by default)',
      });
      return;
    }

    const intervalMs = (() => {
      const raw = Number(process.env.JOB_INGEST_INTERVAL_MS);
      // Default: every 12 hours.
      return Number.isFinite(raw) && raw > 0 ? raw : 12 * 60 * 60 * 1000;
    })();

    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log('info', 'worker.started', { intervalMs });
  }

  async onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const includeKeyed =
        process.env.INGEST_INCLUDE_KEYED === 'true' ||
        process.env.JOB_INGEST_INCLUDE_KEYED !== 'false';
      const result = await runJobIngest({
        includeKeyed,
        logger: this.logger,
      });
      this.logger.log('info', 'worker.tick_ok', {
        totalUpserted: result.totalUpserted,
        providers: result.results.length,
      });
    } catch (error) {
      this.logger.log('error', 'worker.tick_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
