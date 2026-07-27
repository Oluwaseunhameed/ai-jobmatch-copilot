import { enqueueApplicationGenerate, isQueueEnabled } from '@jobmatch/queue';
import {
  createLogger,
  runApplicationGeneration,
  type ApplicationGenerateTrigger,
} from '@jobmatch/resume-parsing';
import { after } from 'next/server';

const logger = createLogger('web-application-generate');

export async function requestApplicationGenerate(
  userId: string,
  draftId: string,
  resumeId: string,
  jobId: string,
  trigger: ApplicationGenerateTrigger = 'manual',
) {
  if (isQueueEnabled()) {
    try {
      const result = await enqueueApplicationGenerate({
        draftId,
        resumeId,
        jobId,
        userId,
        trigger,
      });
      logger.log('info', 'application.enqueued', { draftId, ...result });
      return { mode: 'queued' as const };
    } catch (error) {
      logger.log('error', 'application.enqueue_failed', {
        draftId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.log('warn', 'application.inline_fallback', {
    draftId,
    reason: 'queue disabled or unreachable',
  });

  after(async () => {
    try {
      await runApplicationGeneration({
        draftId,
        userId,
        trigger,
        logger,
      });
    } catch {
      // Failure already recorded on the draft row.
    }
  });

  return { mode: 'inline' as const };
}
