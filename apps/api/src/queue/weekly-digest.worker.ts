import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createLogger, runWeeklyDigests } from '@jobmatch/job-search';

@Injectable()
export class WeeklyDigestWorker implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly logger = createLogger('weekly-digest-worker');
  private running = false;

  onModuleInit() {
    if (process.env.WEEKLY_DIGEST_ENABLED === 'false') {
      this.logger.log('warn', 'worker.disabled', {
        reason: 'WEEKLY_DIGEST_ENABLED=false',
      });
      return;
    }

    const intervalMs = (() => {
      const raw = Number(process.env.WEEKLY_DIGEST_INTERVAL_MS);
      // Default: every 24 hours (cooldown still gates per-user ~weekly sends).
      return Number.isFinite(raw) && raw > 0 ? raw : 24 * 60 * 60 * 1000;
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
      await runWeeklyDigests({ logger: this.logger });
    } catch (error) {
      this.logger.log('error', 'worker.tick_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
