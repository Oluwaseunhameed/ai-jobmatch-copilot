import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import {
  RESUME_PARSE_MAX_ATTEMPTS,
  createResumeParseWorker,
  isQueueEnabled,
  queueDriver,
  type ResumeParseJob,
} from '@jobmatch/queue';
import { createLogger, parseResume } from '@jobmatch/resume-parsing';
import type { Worker } from 'bullmq';

/**
 * Consumes resume parse jobs.
 *
 * The API is a long-lived process, which is why the worker lives here rather than
 * in the Next.js app: parsing can take tens of seconds once LLM enrichment is on,
 * and that must never be tied to the lifetime of an HTTP request.
 */
@Injectable()
export class ResumeParseWorker implements OnModuleInit, OnApplicationShutdown {
  private worker: Worker | null = null;
  private readonly logger = createLogger('resume-parse-worker');

  onModuleInit() {
    if (!isQueueEnabled()) {
      this.logger.log('warn', 'worker.disabled', {
        driver: queueDriver(),
        reason: 'REDIS_URL is not set, so resume parsing runs inline in the web app',
      });
      return;
    }

    this.worker = createResumeParseWorker(async (job: ResumeParseJob) => {
      const attempt = job.attemptsMade + 1;

      return parseResume({
        userId: job.data.userId,
        resumeId: job.data.resumeId,
        trigger: job.data.trigger,
        attempt,
        maxAttempts: job.opts.attempts ?? RESUME_PARSE_MAX_ATTEMPTS,
        logger: this.logger,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.log('error', 'job.failed', {
        jobId: job?.id ?? null,
        resumeId: job?.data?.resumeId ?? null,
        attemptsMade: job?.attemptsMade ?? 0,
        maxAttempts: job?.opts?.attempts ?? RESUME_PARSE_MAX_ATTEMPTS,
        message: error.message,
      });
    });

    this.worker.on('error', (error) => {
      this.logger.log('error', 'worker.error', { message: error.message });
    });

    this.logger.log('info', 'worker.started', { queue: 'resume-parse' });
  }

  async onApplicationShutdown() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.log('info', 'worker.stopped', {});
    }
  }
}
