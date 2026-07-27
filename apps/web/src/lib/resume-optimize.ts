import { enqueueResumeOptimize, isQueueEnabled } from '@jobmatch/queue';
import {
  createLogger,
  runResumeOptimization,
  type ResumeOptimizeTrigger,
} from '@jobmatch/resume-parsing';
import { after } from 'next/server';

const logger = createLogger('web-resume-optimize');

export async function requestResumeOptimize(
  userId: string,
  optimizationId: string,
  resumeId: string,
  jobId: string,
  trigger: ResumeOptimizeTrigger = 'manual',
) {
  if (isQueueEnabled()) {
    try {
      const result = await enqueueResumeOptimize({
        optimizationId,
        resumeId,
        jobId,
        userId,
        trigger,
      });
      logger.log('info', 'optimize.enqueued', { optimizationId, ...result });
      return { mode: 'queued' as const };
    } catch (error) {
      logger.log('error', 'optimize.enqueue_failed', {
        optimizationId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.log('warn', 'optimize.inline_fallback', {
    optimizationId,
    reason: 'queue disabled or unreachable',
  });

  after(async () => {
    try {
      await runResumeOptimization({
        optimizationId,
        userId,
        trigger,
        logger,
      });
    } catch {
      // Failure already recorded on the optimization row.
    }
  });

  return { mode: 'inline' as const };
}
