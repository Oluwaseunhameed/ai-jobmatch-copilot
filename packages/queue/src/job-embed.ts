import { Queue, Worker, type Job, type Processor } from 'bullmq';

import { getConnection, isQueueEnabled } from './connection';

export const JOB_EMBED_QUEUE = 'job-embed';

export type JobEmbedTrigger = 'seed' | 'manual' | 'backfill' | 'retry';

export type JobEmbedJobData = {
  jobId: string;
  trigger: JobEmbedTrigger;
};

export const JOB_EMBED_MAX_ATTEMPTS = 3;

let queue: Queue<JobEmbedJobData> | null = null;

export function getJobEmbedQueue(): Queue<JobEmbedJobData> {
  if (!queue) {
    queue = new Queue<JobEmbedJobData>(JOB_EMBED_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: JOB_EMBED_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 86_400, count: 500 },
      },
    });
  }

  return queue;
}

/** One in-flight job per posting: the job id makes duplicate enqueues idempotent. */
function jobIdFor(jobId: string) {
  // BullMQ forbids ":" in custom ids.
  return `job-embed__${jobId}`;
}

export type EnqueueJobEmbedResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: 'queue_disabled' | 'already_queued' };

export async function enqueueJobEmbed(data: JobEmbedJobData): Promise<EnqueueJobEmbedResult> {
  if (!isQueueEnabled()) {
    return { enqueued: false, reason: 'queue_disabled' };
  }

  const jobs = getJobEmbedQueue();
  const jobId = jobIdFor(data.jobId);
  const existing = await jobs.getJob(jobId);

  if (existing) {
    const state = await existing.getState();

    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return { enqueued: false, reason: 'already_queued' };
    }

    await existing.remove().catch(() => undefined);
  }

  await jobs.add(JOB_EMBED_QUEUE, data, { jobId });
  return { enqueued: true, jobId };
}

/**
 * Enqueue many postings at once. Used after seeding, where adding jobs one at a
 * time would mean a round trip per posting.
 */
export async function enqueueJobEmbedBulk(
  jobIds: string[],
  trigger: JobEmbedTrigger,
): Promise<{ enqueued: number; skipped: number }> {
  if (!isQueueEnabled() || jobIds.length === 0) {
    return { enqueued: 0, skipped: jobIds.length };
  }

  const queueRef = getJobEmbedQueue();

  await queueRef.addBulk(
    jobIds.map((jobId) => ({
      name: JOB_EMBED_QUEUE,
      data: { jobId, trigger } satisfies JobEmbedJobData,
      opts: { jobId: jobIdFor(jobId) },
    })),
  );

  return { enqueued: jobIds.length, skipped: 0 };
}

export function createJobEmbedWorker(
  processor: Processor<JobEmbedJobData>,
  options?: { concurrency?: number },
) {
  const concurrency = options?.concurrency ?? (Number(process.env.JOB_EMBED_CONCURRENCY) || 4);

  return new Worker<JobEmbedJobData>(JOB_EMBED_QUEUE, processor, {
    connection: getConnection(),
    concurrency,
  });
}

export type JobEmbedJob = Job<JobEmbedJobData>;
