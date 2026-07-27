import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import {
  RESUME_OPTIMIZE_MAX_ATTEMPTS,
  createResumeOptimizeWorker,
  isQueueEnabled,
  queueDriver,
  type ResumeOptimizeJob,
} from '@jobmatch/queue';
import { createLogger, runResumeOptimization } from '@jobmatch/resume-parsing';
import type { Worker } from 'bullmq';

@Injectable()
export class ResumeOptimizeWorker implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker | null = null;
  private readonly logger = createLogger('resume-optimize-worker');

  onModuleInit() {
    if (!isQueueEnabled()) {
      this.logger.log('warn', 'worker.disabled', {
        driver: queueDriver(),
        reason: 'REDIS_URL is not set, so resume optimisation runs inline in the web app',
      });
      return;
    }

    this.worker = createResumeOptimizeWorker(async (job: ResumeOptimizeJob) => {
      const attempt = job.attemptsMade + 1;
      return runResumeOptimization({
        optimizationId: job.data.optimizationId,
        userId: job.data.userId,
        trigger: job.data.trigger,
        attempt,
        maxAttempts: job.opts.attempts ?? RESUME_OPTIMIZE_MAX_ATTEMPTS,
        logger: this.logger,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.log('error', 'job.failed', {
        jobId: job?.id ?? null,
        optimizationId: job?.data?.optimizationId ?? null,
        message: error.message,
      });
    });

    this.worker.on('error', (error) => {
      this.logger.log('error', 'worker.error', { message: error.message });
    });

    this.logger.log('info', 'worker.started', { queue: 'resume-optimize' });
  }

  async onApplicationShutdown() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.log('info', 'worker.stopped', {});
    }
  }
}
