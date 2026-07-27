import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createLogger, runApplicationReminders } from '@jobmatch/resume-parsing';

@Injectable()
export class ApplicationReminderWorker implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly logger = createLogger('application-reminder-worker');
  private running = false;

  onModuleInit() {
    if (process.env.APPLICATION_REMINDERS_ENABLED === 'false') {
      this.logger.log('warn', 'worker.disabled', {
        reason: 'APPLICATION_REMINDERS_ENABLED=false',
      });
      return;
    }

    const intervalMs = (() => {
      const raw = Number(process.env.APPLICATION_REMINDER_INTERVAL_MS);
      // Default: every 6 hours.
      return Number.isFinite(raw) && raw > 0 ? raw : 6 * 60 * 60 * 1000;
    })();

    // Kick once shortly after boot, then on the interval.
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
      await runApplicationReminders({ logger: this.logger });
    } catch (error) {
      this.logger.log('error', 'worker.tick_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
