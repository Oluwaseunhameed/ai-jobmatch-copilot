import { Queue, Worker, type Job, type Processor } from 'bullmq';

import { getConnection, isQueueEnabled } from './connection';

export const RESUME_OPTIMIZE_QUEUE = 'resume-optimize';

export type ResumeOptimizeTrigger = 'manual' | 'retry';

export type ResumeOptimizeJobData = {
  optimizationId: string;
  resumeId: string;
  jobId: string;
  userId: string;
  trigger: ResumeOptimizeTrigger;
};

export const RESUME_OPTIMIZE_MAX_ATTEMPTS = 2;

let queue: Queue<ResumeOptimizeJobData> | null = null;

export function getResumeOptimizeQueue(): Queue<ResumeOptimizeJobData> {
  if (!queue) {
    queue = new Queue<ResumeOptimizeJobData>(RESUME_OPTIMIZE_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: RESUME_OPTIMIZE_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 8_000 },
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 86_400, count: 500 },
      },
    });
  }

  return queue;
}

function jobIdFor(optimizationId: string) {
  return `resume-optimize__${optimizationId}`;
}

export type EnqueueOptimizeResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: 'queue_disabled' | 'already_queued' };

export async function enqueueResumeOptimize(
  data: ResumeOptimizeJobData,
): Promise<EnqueueOptimizeResult> {
  if (!isQueueEnabled()) {
    return { enqueued: false, reason: 'queue_disabled' };
  }

  const jobs = getResumeOptimizeQueue();
  const jobId = jobIdFor(data.optimizationId);
  const existing = await jobs.getJob(jobId);

  if (existing) {
    const state = await existing.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return { enqueued: false, reason: 'already_queued' };
    }
    await existing.remove().catch(() => undefined);
  }

  await jobs.add(RESUME_OPTIMIZE_QUEUE, data, { jobId });
  return { enqueued: true, jobId };
}

export function createResumeOptimizeWorker(
  processor: Processor<ResumeOptimizeJobData>,
  options?: { concurrency?: number },
) {
  const concurrency =
    options?.concurrency ?? (Number(process.env.RESUME_OPTIMIZE_CONCURRENCY) || 1);

  return new Worker<ResumeOptimizeJobData>(RESUME_OPTIMIZE_QUEUE, processor, {
    connection: getConnection(),
    concurrency,
  });
}

export type ResumeOptimizeJob = Job<ResumeOptimizeJobData>;
