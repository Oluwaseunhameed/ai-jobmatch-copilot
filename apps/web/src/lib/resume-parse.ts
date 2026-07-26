import { enqueueResumeParse, isQueueEnabled } from '@jobmatch/queue';
import {
  createLogger,
  parseResume,
  type ResumeParseTrigger,
} from '@jobmatch/resume-parsing';
import { after } from 'next/server';

const logger = createLogger('web-resume-parse');

export { parseResume };

/**
 * Hand a parse off to the background worker.
 *
 * With Redis configured the work runs in the API's queue worker, which survives
 * beyond this request. Without Redis we fall back to `after()` so local development
 * still works — same parse implementation either way, no duplicated logic.
 */
export async function requestResumeParse(
  userId: string,
  resumeId: string,
  trigger: ResumeParseTrigger,
) {
  if (isQueueEnabled()) {
    try {
      const result = await enqueueResumeParse({ resumeId, userId, trigger });
      logger.log('info', 'parse.enqueued', { resumeId, trigger, ...result });
      return { mode: 'queued' as const };
    } catch (error) {
      // Redis being unavailable must not lose the upload; degrade to inline.
      logger.log('error', 'parse.enqueue_failed', {
        resumeId,
        trigger,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.log('warn', 'parse.inline_fallback', {
    resumeId,
    trigger,
    reason: 'queue disabled or unreachable',
  });

  after(async () => {
    try {
      await parseResume({ userId, resumeId, trigger, logger });
    } catch {
      // parseResume already recorded the failure on the resume row.
    }
  });

  return { mode: 'inline' as const };
}
