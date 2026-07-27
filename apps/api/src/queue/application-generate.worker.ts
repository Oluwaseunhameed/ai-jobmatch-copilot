import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import {
  APPLICATION_GENERATE_MAX_ATTEMPTS,
  createApplicationGenerateWorker,
  isQueueEnabled,
  queueDriver,
  type ApplicationGenerateJob,
} from '@jobmatch/queue';
import { createLogger, runApplicationGeneration } from '@jobmatch/resume-parsing';
import type { Worker } from 'bullmq';

@Injectable()
export class ApplicationGenerateWorker implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker | null = null;
  private readonly logger = createLogger('application-generate-worker');

  onModuleInit() {
    if (!isQueueEnabled()) {
      this.logger.log('warn', 'worker.disabled', {
        driver: queueDriver(),
        reason: 'REDIS_URL is not set, so application drafts run inline in the web app',
      });
      return;
    }

    this.worker = createApplicationGenerateWorker(async (job: ApplicationGenerateJob) => {
      const attempt = job.attemptsMade + 1;
      return runApplicationGeneration({
        draftId: job.data.draftId,
        userId: job.data.userId,
        trigger: job.data.trigger,
        attempt,
        maxAttempts: job.opts.attempts ?? APPLICATION_GENERATE_MAX_ATTEMPTS,
        logger: this.logger,
      });
    });

    const worker = this.worker;

    worker.on('failed', (job, error) => {
      this.logger.log('error', 'job.failed', {
        jobId: job?.id ?? null,
        draftId: job?.data?.draftId ?? null,
        message: error.message,
      });
    });

    worker.on('error', (error) => {
      this.logger.log('error', 'worker.error', { message: error.message });
    });

    this.logger.log('info', 'worker.started', { queue: 'application-generate' });
  }

  async onApplicationShutdown() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.log('info', 'worker.stopped', {});
    }
  }
}
