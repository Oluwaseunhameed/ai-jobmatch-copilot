import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import {
  JOB_EMBED_MAX_ATTEMPTS,
  createJobEmbedWorker,
  isQueueEnabled,
  queueDriver,
  type JobEmbedJob,
} from '@jobmatch/queue';
import { createLogger, embedJob } from '@jobmatch/job-search';
import type { Worker } from 'bullmq';

/**
 * Consumes job-embedding jobs.
 *
 * Lives in the API process for the same reason as the resume parse worker:
 * embedding is IO-bound against Ollama and must outlive any HTTP request.
 */
@Injectable()
export class JobEmbedWorker implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker | null = null;
  private readonly logger = createLogger('job-embed-worker');

  onModuleInit() {
    if (!isQueueEnabled()) {
      this.logger.log('warn', 'worker.disabled', {
        driver: queueDriver(),
        reason: 'REDIS_URL is not set, so job embeddings run via "pnpm jobs:embed"',
      });
      return;
    }

    this.worker = createJobEmbedWorker(async (job: JobEmbedJob) => {
      const attempt = job.attemptsMade + 1;

      return embedJob({
        jobId: job.data.jobId,
        trigger: job.data.trigger,
        attempt,
        maxAttempts: job.opts.attempts ?? JOB_EMBED_MAX_ATTEMPTS,
        logger: this.logger,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.log('error', 'job.failed', {
        jobId: job?.id ?? null,
        postingId: job?.data?.jobId ?? null,
        attemptsMade: job?.attemptsMade ?? 0,
        maxAttempts: job?.opts?.attempts ?? JOB_EMBED_MAX_ATTEMPTS,
        message: error.message,
      });
    });

    this.worker.on('error', (error) => {
      this.logger.log('error', 'worker.error', { message: error.message });
    });

    this.logger.log('info', 'worker.started', { queue: 'job-embed' });
  }

  async onApplicationShutdown() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.log('info', 'worker.stopped', {});
    }
  }
}
