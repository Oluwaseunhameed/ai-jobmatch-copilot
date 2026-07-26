import { Queue, Worker, type Job, type Processor } from 'bullmq';

import { getConnection, isQueueEnabled } from './connection';

export const RESUME_PARSE_QUEUE = 'resume-parse';

export type ResumeParseTrigger = 'upload' | 'manual' | 'retry';

export type ResumeParseJobData = {
  resumeId: string;
  userId: string;
  trigger: ResumeParseTrigger;
};

export const RESUME_PARSE_MAX_ATTEMPTS = 3;

let queue: Queue<ResumeParseJobData> | null = null;

export function getResumeParseQueue(): Queue<ResumeParseJobData> {
  if (!queue) {
    queue = new Queue<ResumeParseJobData>(RESUME_PARSE_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: RESUME_PARSE_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5_000 },
        // Keep a short tail of finished jobs for debugging without growing forever.
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 86_400, count: 500 },
      },
    });
  }

  return queue;
}

/** One in-flight job per resume: the job id makes duplicate enqueues idempotent. */
function jobIdFor(resumeId: string) {
  // BullMQ forbids ":" in custom ids.
  return `resume-parse__${resumeId}`;
}

export type EnqueueResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: 'queue_disabled' | 'already_queued' };

export async function enqueueResumeParse(data: ResumeParseJobData): Promise<EnqueueResult> {
  if (!isQueueEnabled()) {
    return { enqueued: false, reason: 'queue_disabled' };
  }

  const jobs = getResumeParseQueue();
  const jobId = jobIdFor(data.resumeId);
  const existing = await jobs.getJob(jobId);

  if (existing) {
    const state = await existing.getState();

    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return { enqueued: false, reason: 'already_queued' };
    }

    // A finished or failed job still occupies the id, so clear it before re-adding.
    await existing.remove().catch(() => undefined);
  }

  await jobs.add(RESUME_PARSE_QUEUE, data, { jobId });
  return { enqueued: true, jobId };
}

export function createResumeParseWorker(
  processor: Processor<ResumeParseJobData>,
  options?: { concurrency?: number },
) {
  const concurrency =
    options?.concurrency ?? (Number(process.env.RESUME_PARSE_CONCURRENCY) || 2);

  return new Worker<ResumeParseJobData>(RESUME_PARSE_QUEUE, processor, {
    connection: getConnection(),
    concurrency,
  });
}

export type ResumeParseJob = Job<ResumeParseJobData>;
